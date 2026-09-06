const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest } = require('../utils/response');
const { isValidDate } = require('../utils/validate');

const getAntrian = async (req, res) => {
  try {
    const { dokter_id, status } = req.query;
    const tanggal = req.query.tanggal || new Date().toISOString().split('T')[0];

    if (!isValidDate(tanggal)) return badRequest(res, 'Format tanggal tidak valid');

    const validStatus = ['menunggu', 'diperiksa', 'selesai', 'batal'];
    if (status && !validStatus.includes(status))
      return badRequest(res, 'Status tidak valid');

    const params = [tanggal];
    let where = 'WHERE k.tanggal=$1 AND k.deleted_at IS NULL';

    if (req.user.role === 'dokter') {
      const dr = await pool.query(
        'SELECT id FROM dokter WHERE user_id=$1 AND deleted_at IS NULL', [req.user.id]
      );
      if (dr.rows.length) {
        params.push(dr.rows[0].id);
        where += ` AND k.dokter_id=$${params.length}`;
      }
    } else if (dokter_id) {
      const dId = parseInt(dokter_id);
      if (!isNaN(dId)) { params.push(dId); where += ` AND k.dokter_id=$${params.length}`; }
    }

    if (status) { params.push(status); where += ` AND k.status=$${params.length}`; }

    const { rows } = await pool.query(
      `SELECT k.id, k.tanggal, k.waktu_daftar, k.status, k.keluhan,
              p.id AS pasien_id, p.no_rm, p.nama AS nama_pasien,
              p.tanggal_lahir, p.jenis_kelamin, p.kelas,
              d.id AS dokter_id, d.nama AS nama_dokter,
              rm.id AS rekam_medis_id,
              r.id AS resep_id, r.status AS status_resep
       FROM kunjungan k
       JOIN pasien p ON k.pasien_id = p.id
       LEFT JOIN dokter d ON k.dokter_id = d.id
       LEFT JOIN rekam_medis rm ON rm.kunjungan_id = k.id
       LEFT JOIN resep r ON r.kunjungan_id = k.id AND r.deleted_at IS NULL
       ${where} ORDER BY k.waktu_daftar ASC`,
      params
    );
    return success(res, rows);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'kunjunganController.getAntrian');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID kunjungan tidak valid');

    const { rows } = await pool.query(
      `SELECT k.*, p.no_rm, p.nama AS nama_pasien, p.tanggal_lahir,
              p.jenis_kelamin, p.alamat, p.kelas, d.nama AS nama_dokter
       FROM kunjungan k
       JOIN pasien p ON k.pasien_id = p.id
       LEFT JOIN dokter d ON k.dokter_id = d.id
       WHERE k.id=$1 AND k.deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return notFound(res, 'Kunjungan tidak ditemukan');
    return success(res, rows[0]);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'kunjunganController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const { pasien_id, dokter_id, tanggal, keluhan, catatan_triage } = req.body;

    const pId = parseInt(pasien_id);
    if (isNaN(pId)) return badRequest(res, 'ID pasien tidak valid');
    if (tanggal && !isValidDate(tanggal)) return badRequest(res, 'Format tanggal tidak valid');

    if (!(await pool.query(
      'SELECT id FROM pasien WHERE id=$1 AND deleted_at IS NULL', [pId]
    )).rows.length)
      return notFound(res, 'Pasien tidak ditemukan');

    const targetDate = tanggal || new Date().toISOString().split('T')[0];
    const dId = dokter_id ? parseInt(dokter_id) : null;

    const { rows } = await pool.query(
      `INSERT INTO kunjungan(pasien_id, dokter_id, tanggal, keluhan, catatan_triage, status)
       VALUES($1,$2,$3,$4,$5,'menunggu') RETURNING *`,
      [pId, dId || null, targetDate, keluhan || null, catatan_triage || null]
    );
    return created(res, rows[0], 'Kunjungan berhasil didaftarkan');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'kunjunganController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID kunjungan tidak valid');

    const { status, dokter_id } = req.body;
    const validStatus = ['menunggu', 'diperiksa', 'selesai', 'batal'];
    if (!validStatus.includes(status)) return badRequest(res, 'Status tidak valid');

    const sets   = ['status=$1', 'updated_at=NOW()'];
    const params = [status];
    if (dokter_id) {
      const dId = parseInt(dokter_id);
      if (!isNaN(dId)) { params.push(dId); sets.push(`dokter_id=$${params.length}`); }
    }
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE kunjungan SET ${sets.join(',')} WHERE id=$${params.length} AND deleted_at IS NULL RETURNING *`,
      params
    );
    if (!rows.length) return notFound(res, 'Kunjungan tidak ditemukan');
    return success(res, rows[0], 'Status diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'kunjunganController.updateStatus');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Selesaikan kunjungan tanpa resep → menunggu_bayar ─────────────────────
// Dipanggil dokter/admin setelah pemeriksaan selesai tapi tidak ada resep.
// Body: { tarif_ids: [1, 2, ...] } — tarif yang dipilih dokter.
const selesaikanKunjungan = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID kunjungan tidak valid');

    const { tarif_ids } = req.body;
    // tarif_ids boleh kosong (array kosong = tidak ada tarif tambahan)
    if (!Array.isArray(tarif_ids))
      return badRequest(res, 'tarif_ids harus berupa array');

    await withTransaction(pool, async (client) => {
      const kj = (await client.query(
        'SELECT id, status, pasien_id FROM kunjungan WHERE id=$1 AND deleted_at IS NULL FOR UPDATE', [id]
      )).rows[0];
      if (!kj) throw Object.assign(new Error('Kunjungan tidak ditemukan'), { statusCode: 404 });
      if (kj.status !== 'diperiksa')
        throw Object.assign(
          new Error(`Kunjungan harus berstatus 'diperiksa', saat ini: '${kj.status}'`),
          { statusCode: 400 }
        );

      // Validasi semua tarif_id ada dan aktif
      for (const tid of tarif_ids) {
        const tarif = (await client.query(
          'SELECT id FROM tarif_layanan WHERE id=$1 AND aktif=TRUE AND deleted_at IS NULL', [parseInt(tid)]
        )).rows[0];
        if (!tarif) throw Object.assign(new Error(`Tarif ID ${tid} tidak ditemukan atau tidak aktif`), { statusCode: 400 });
      }

      // Simpan pilihan tarif dokter ke tabel kunjungan_tarif agar kasir bisa
      // mengambilnya otomatis saat membuka halaman proses pembayaran
      for (const tid of tarif_ids) {
        await client.query(
          'INSERT INTO kunjungan_tarif(kunjungan_id, tarif_id, dipilih_oleh) VALUES($1,$2,$3)',
          [id, parseInt(tid), req.user.id]
        );
      }

      await client.query(
        "UPDATE kunjungan SET status='menunggu_bayar' WHERE id=$1", [id]
      );
    });

    // Ambil kunjungan yang sudah diupdate beserta tarif yang dipilih
    const kj = (await pool.query(
      `SELECT k.id, k.status, k.pasien_id, p.nama AS nama_pasien, p.jenis_pasien
       FROM kunjungan k JOIN pasien p ON k.pasien_id = p.id
       WHERE k.id=$1`, [id]
    )).rows[0];

    // Ambil detail tarif yang dipilih (untuk dikembalikan ke frontend)
    const tarifDipilih = tarif_ids.length
      ? (await pool.query(
          'SELECT id, nama, harga FROM tarif_layanan WHERE id=ANY($1)', [tarif_ids]
        )).rows
      : [];

    return success(res, { kunjungan: kj, tarif_dipilih: tarifDipilih },
      'Kunjungan selesai, menunggu pembayaran');
  } catch (err) {
    if (err.statusCode === 404) return notFound(res, err.message);
    if (err.statusCode === 400) return badRequest(res, err.message);
    logger.error({ err, userId: req.user?.id }, 'kunjunganController.selesaikanKunjungan');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ── Display TV: antrian publik hari ini (tanpa auth) ──────────────────────
// Endpoint ini sengaja tidak memerlukan JWT karena diakses dari TV/layar
// umum di ruang tunggu yang tidak punya session login.
// Data yang dikembalikan minimal — tidak ada data medis sensitif:
// hanya nomor antrian, nama pasien, nama dokter, dan status.
const getAntrianPublik = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { rows } = await pool.query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY k.waktu_daftar ASC) AS nomor_antrian,
         k.id,
         k.status,
         k.waktu_daftar,
         p.nama  AS nama_pasien,
         p.kelas,
         d.nama  AS nama_dokter,
         d.spesialisasi
       FROM kunjungan k
       JOIN pasien p ON k.pasien_id = p.id
       LEFT JOIN dokter d ON k.dokter_id = d.id
       WHERE k.tanggal = $1
         AND k.deleted_at IS NULL
         AND k.status IN ('menunggu', 'diperiksa', 'selesai')
       ORDER BY k.waktu_daftar ASC`,
      [today]
    );

    // Hitung ringkasan
    const summary = {
      menunggu:  rows.filter((r) => r.status === 'menunggu').length,
      diperiksa: rows.filter((r) => r.status === 'diperiksa').length,
      selesai:   rows.filter((r) => r.status === 'selesai').length,
      total:     rows.length,
    };

    return success(res, { summary, antrian: rows });
  } catch (err) {
    logger.error({ err }, 'kunjunganController.getAntrianPublik');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAntrian, getById, create, updateStatus, getAntrianPublik, selesaikanKunjungan };
