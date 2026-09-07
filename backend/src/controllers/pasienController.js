const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, created, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');
const { isValidDate } = require('../utils/validate');

const { recordAudit } = require('../utils/audit');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();
    const jenis  = req.query.jenis_pasien || '';

    const conditions = ['deleted_at IS NULL'];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(nama ILIKE $${params.length} OR no_rm ILIKE $${params.length} OR kelas ILIKE $${params.length} OR nis ILIKE $${params.length})`
      );
    }

    if (jenis && ['siswa', 'umum'].includes(jenis)) {
      params.push(jenis);
      conditions.push(`jenis_pasien=$${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await paginateQuery(
      pool,
      `SELECT id, no_rm, nama, jenis_pasien, tanggal_lahir, jenis_kelamin,
              alamat, no_telepon, kelas, nis, nik,
              -- flag keberadaan info medis kritis — untuk indikator ⚠ di list
              (alergi IS NOT NULL AND alergi <> '')         AS has_alergi,
              (kondisi_khusus IS NOT NULL AND kondisi_khusus <> '') AS has_kondisi,
              created_at
       FROM pasien ${where} ORDER BY created_at DESC`,
      params,
      pg
    );

    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pasienController.getAll');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pasien tidak valid');

    const { rows } = await pool.query(
      'SELECT * FROM pasien WHERE id=$1 AND deleted_at IS NULL', [id]
    );
    if (!rows.length) return notFound(res, 'Pasien tidak ditemukan');

    const kunjungan = await pool.query(
      `SELECT k.id, k.tanggal, k.status, k.keluhan,
              d.nama AS nama_dokter, rm.diagnosa, rm.id AS rekam_medis_id
       FROM kunjungan k
       LEFT JOIN dokter d ON k.dokter_id = d.id
       LEFT JOIN rekam_medis rm ON rm.kunjungan_id = k.id
       WHERE k.pasien_id = $1 AND k.deleted_at IS NULL
       ORDER BY k.tanggal DESC LIMIT 20`,
      [id]
    );
    return success(res, { ...rows[0], riwayat_kunjungan: kunjungan.rows });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pasienController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const {
      nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon,
      kelas, keterangan,
      // field baru
      jenis_pasien, nis, nik,
      nama_wali, telepon_wali, hubungan_wali,
      alergi, kondisi_khusus,
    } = req.body;

    if (tanggal_lahir && !isValidDate(tanggal_lahir))
      return badRequest(res, 'Format tanggal lahir tidak valid');

    const no_rm = (await pool.query('SELECT generate_no_rm() AS no_rm')).rows[0].no_rm;
    const { rows } = await pool.query(
      `INSERT INTO pasien(
         no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas, keterangan,
         jenis_pasien, nis, nik,
         nama_wali, telepon_wali, hubungan_wali,
         alergi, kondisi_khusus
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        no_rm, nama.trim(), tanggal_lahir || null, jenis_kelamin || null,
        alamat || null, no_telepon || null, kelas || null, keterangan || null,
        jenis_pasien || 'siswa',
        nis || null, nik || null,
        nama_wali || null, telepon_wali || null, hubungan_wali || null,
        alergi || null, kondisi_khusus || null,
      ]
    );
    return created(res, rows[0], 'Pasien berhasil didaftarkan');
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_pasien_nik_unique')
      return badRequest(res, 'NIK sudah digunakan pasien lain');
    logger.error({ err, userId: req.user?.id }, 'pasienController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pasien tidak valid');

    const {
      nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon,
      kelas, keterangan,
      // field baru
      jenis_pasien, nis, nik,
      nama_wali, telepon_wali, hubungan_wali,
      alergi, kondisi_khusus,
    } = req.body;

    if (!nama || !nama.trim()) return badRequest(res, 'Nama pasien wajib diisi');
    if (tanggal_lahir && !isValidDate(tanggal_lahir))
      return badRequest(res, 'Format tanggal lahir tidak valid');

    // Ambil nilai lama untuk diff identitas sensitif + fallback jenis_pasien
    const sebelum = (await pool.query(
      'SELECT nik, tanggal_lahir, jenis_pasien FROM pasien WHERE id=$1 AND deleted_at IS NULL', [id]
    )).rows[0];
    if (!sebelum) return notFound(res, 'Pasien tidak ditemukan');

    const { rows } = await pool.query(
      `UPDATE pasien
       SET nama=$1, tanggal_lahir=$2, jenis_kelamin=$3, alamat=$4,
           no_telepon=$5, kelas=$6, keterangan=$7,
           jenis_pasien=$8, nis=$9, nik=$10,
           nama_wali=$11, telepon_wali=$12, hubungan_wali=$13,
           alergi=$14, kondisi_khusus=$15
       WHERE id=$16 AND deleted_at IS NULL
       RETURNING *`,
      [
        nama.trim(), tanggal_lahir || null, jenis_kelamin || null,
        alamat || null, no_telepon || null, kelas || null, keterangan || null,
        jenis_pasien !== undefined ? jenis_pasien : sebelum.jenis_pasien,
        nis || null, nik || null,
        nama_wali || null, telepon_wali || null, hubungan_wali || null,
        alergi || null, kondisi_khusus || null,
        id,
      ]
    );
    if (!rows.length) return notFound(res, 'Pasien tidak ditemukan');

    // Catat jika NIK atau tanggal_lahir berubah
    const perubahan = {};
    const nikLama   = sebelum.nik ?? null;
    const nikBaru   = nik    || null;
    const tglLama   = sebelum.tanggal_lahir
      ? new Date(sebelum.tanggal_lahir).toISOString().slice(0, 10)
      : null;
    const tglBaru   = tanggal_lahir || null;

    if (nikLama !== nikBaru)     perubahan.nik           = [nikLama, nikBaru];
    if (tglLama !== tglBaru)     perubahan.tanggal_lahir = [tglLama, tglBaru];

    if (Object.keys(perubahan).length > 0) {
      recordAudit(pool, logger, {
        userId    : req.user.id,
        userName  : req.user.nama,
        userRole  : req.user.role,
        aksi      : 'UBAH_IDENTITAS_PASIEN',
        entitas   : 'pasien',
        entitasId : id,
        deskripsi : `Identitas sensitif pasien #${id} (${rows[0].nama}) diubah`,
        perubahan,
        ipAddress : req.ip,
      });
    }

    return success(res, rows[0], 'Data pasien berhasil diperbarui');
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'idx_pasien_nik_unique')
      return badRequest(res, 'NIK sudah digunakan pasien lain');
    logger.error({ err, userId: req.user?.id }, 'pasienController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pasien tidak valid');

    // Cegah hapus pasien yang masih punya kunjungan aktif — akan meninggalkan
    // antrian orphan yang tidak bisa diselesaikan
    const kunjunganAktif = (await pool.query(
      `SELECT id FROM kunjungan
       WHERE pasien_id = $1
         AND status IN ('menunggu', 'diperiksa', 'menunggu_bayar')
         AND deleted_at IS NULL
       LIMIT 1`,
      [id]
    )).rows;
    if (kunjunganAktif.length)
      return badRequest(res, 'Pasien tidak dapat dihapus karena masih memiliki kunjungan aktif. Selesaikan atau batalkan kunjungan terlebih dahulu.');

    const { rows } = await pool.query(
      'UPDATE pasien SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id', [id]
    );
    if (!rows.length) return notFound(res, 'Pasien tidak ditemukan');
    return success(res, null, 'Data pasien berhasil dihapus');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pasienController.remove');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAll, getById, create, update, remove };
