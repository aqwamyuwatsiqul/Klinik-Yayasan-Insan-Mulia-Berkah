const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest, forbidden } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');

// ── FIX S3: IDOR — cek kepemilikan dokter sebelum return data ──────────────
const getByKunjungan = async (req, res) => {
  try {
    // FIX #1: validasi param sebelum query — cegah PostgreSQL type error → 500
    const kunjunganId = parseInt(req.params.kunjunganId);
    if (isNaN(kunjunganId)) return badRequest(res, 'ID kunjungan tidak valid');

    const { rows } = await pool.query(
      `SELECT rm.*, d.nama AS nama_dokter, d.spesialisasi,
              p.no_rm, p.nama AS nama_pasien, p.tanggal_lahir, p.jenis_kelamin
       FROM rekam_medis rm
       JOIN dokter d ON rm.dokter_id = d.id
       JOIN pasien p ON rm.pasien_id = p.id
       WHERE rm.kunjungan_id = $1 AND rm.deleted_at IS NULL`,
      [kunjunganId]
    );
    if (!rows.length) return notFound(res, 'Rekam medis belum diisi');

    // Dokter hanya boleh melihat rekam medis yang ditangani sendiri
    // Owner dan admin boleh melihat semua
    if (req.user.role === 'dokter') {
      const dr = (await pool.query(
        'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
      )).rows[0];
      if (!dr || dr.id !== rows[0].dokter_id)
        return forbidden(res, 'Akses ditolak. Anda bukan dokter pemeriksa pasien ini.');
    }
    return success(res, rows[0]);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'rekamMedisController.getByKunjungan');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── FIX IDOR: getByPasien ─────────────────────────────────────────────────
// Hanya admin dan dokter yang boleh akses.
// Dokter hanya bisa melihat rekam medis pasien yang PERNAH ia tangani sendiri.
// Apoteker diblokir — tidak perlu melihat diagnosa/catatan klinis lengkap.
const getByPasien = async (req, res) => {
  try {
    // Blokir role non-medis di level controller (defense-in-depth)
    // apoteker dan kasir tidak berhak mengakses rekam medis klinis
    if (req.user.role === 'apoteker' || req.user.role === 'kasir')
      return forbidden(res, 'Role Anda tidak berhak mengakses rekam medis pasien');

    const pasienId = parseInt(req.params.pasienId);
    if (isNaN(pasienId)) return badRequest(res, 'ID pasien tidak valid');

    // M4 FIX: Satu query langsung JOIN dokter — eliminasi N+1
    // Sebelumnya: query 1 untuk cari dokter_id, query 2 untuk cek rekam_medis
    // Sekarang: satu query JOIN yang langsung cek keduanya sekaligus
    if (req.user.role === 'dokter') {
      const check = (await pool.query(
        `SELECT rm.id FROM rekam_medis rm
         JOIN dokter d ON rm.dokter_id = d.id
         WHERE rm.pasien_id = $1
           AND d.user_id   = $2
           AND rm.deleted_at IS NULL
         LIMIT 1`,
        [pasienId, req.user.id]
      )).rows[0];
      if (!check)
        return forbidden(res, 'Akses ditolak. Anda tidak memiliki rekam medis untuk pasien ini.');
    }
    // admin dan owner tidak dibatasi per-dokter — bisa lihat semua riwayat pasien

    const pg = parsePagination(req.query);

    // M5 FIX: paginateQuery — satu query COUNT(*) OVER()
    const result = await paginateQuery(
      pool,
      `SELECT rm.id, rm.kunjungan_id, rm.tanggal_periksa, rm.keluhan, rm.diagnosa,
              rm.terapi, rm.catatan, rm.tekanan_darah, rm.suhu, rm.berat_badan, rm.tinggi_badan,
              d.nama AS nama_dokter
       FROM rekam_medis rm
       JOIN dokter d ON rm.dokter_id = d.id
       WHERE rm.pasien_id = $1 AND rm.deleted_at IS NULL
       ORDER BY rm.tanggal_periksa DESC`,
      [pasienId],
      pg
    );

    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'rekamMedisController.getByPasien');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const {
      kunjungan_id, keluhan, pemeriksaan, diagnosa, terapi, catatan,
      tekanan_darah, suhu, berat_badan, tinggi_badan,
    } = req.body;

    if (!kunjungan_id || isNaN(parseInt(kunjungan_id)))
      return badRequest(res, 'ID kunjungan tidak valid');

    // M2 FIX: withTransaction — ROLLBACK aman
    const rekamMedis = await withTransaction(pool, async (client) => {
      const kj = (await client.query(
        'SELECT id, pasien_id, dokter_id FROM kunjungan WHERE id=$1 AND deleted_at IS NULL',
        [parseInt(kunjungan_id)]
      )).rows[0];
      if (!kj) throw Object.assign(new Error('Kunjungan tidak ditemukan'), { statusCode: 404 });

      if ((await client.query(
        'SELECT id FROM rekam_medis WHERE kunjungan_id=$1 AND deleted_at IS NULL', [kunjungan_id]
      )).rows.length)
        throw Object.assign(new Error('Rekam medis sudah ada untuk kunjungan ini'), { statusCode: 400 });

      let dokter_id = kj.dokter_id;
      if (req.user.role === 'dokter') {
        const dr = (await client.query(
          'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
        )).rows[0];
        if (dr) dokter_id = dr.id;
      }

      const { rows } = await client.query(
        `INSERT INTO rekam_medis(kunjungan_id, pasien_id, dokter_id, keluhan, pemeriksaan,
                                 diagnosa, terapi, catatan, tekanan_darah, suhu, berat_badan, tinggi_badan)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [kunjungan_id, kj.pasien_id, dokter_id,
          keluhan || null, pemeriksaan || null, diagnosa || null, terapi || null,
          catatan || null, tekanan_darah || null, suhu || null,
          berat_badan || null, tinggi_badan || null]
      );
      await client.query(
        `UPDATE kunjungan SET status='diperiksa', dokter_id=$1 WHERE id=$2`,
        [dokter_id, kunjungan_id]
      );
      return rows[0];
    });

    return created(res, rekamMedis, 'Rekam medis berhasil disimpan');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'rekamMedisController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID rekam medis tidak valid');

    const {
      keluhan, pemeriksaan, diagnosa, terapi, catatan,
      tekanan_darah, suhu, berat_badan, tinggi_badan,
    } = req.body;

    // FIX S3: pastikan dokter hanya bisa update rekam medis miliknya
    const existing = (await pool.query(
      'SELECT id, dokter_id FROM rekam_medis WHERE id=$1 AND deleted_at IS NULL', [id]
    )).rows[0];
    if (!existing) return notFound(res, 'Rekam medis tidak ditemukan');

    if (req.user.role === 'dokter') {
      const dr = (await pool.query(
        'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
      )).rows[0];
      if (!dr || dr.id !== existing.dokter_id)
        return forbidden(res, 'Akses ditolak. Anda bukan dokter pemeriksa pasien ini.');
    }

    const { rows } = await pool.query(
      `UPDATE rekam_medis SET keluhan=$1, pemeriksaan=$2, diagnosa=$3, terapi=$4, catatan=$5,
              tekanan_darah=$6, suhu=$7, berat_badan=$8, tinggi_badan=$9
       WHERE id=$10 AND deleted_at IS NULL RETURNING *`,
      [keluhan || null, pemeriksaan || null, diagnosa || null, terapi || null,
        catatan || null, tekanan_darah || null, suhu || null,
        berat_badan || null, tinggi_badan || null, id]
    );
    return success(res, rows[0], 'Rekam medis diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'rekamMedisController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getByKunjungan, getByPasien, create, update };
