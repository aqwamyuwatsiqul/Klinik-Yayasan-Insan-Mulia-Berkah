const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, created, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');
const { isValidDate } = require('../utils/validate');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();

    const conditions = ['deleted_at IS NULL'];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(nama ILIKE $${params.length} OR no_rm ILIKE $${params.length} OR kelas ILIKE $${params.length})`
      );
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    // M5 FIX: satu query dengan COUNT(*) OVER() — tidak ada double round-trip
    const result = await paginateQuery(
      pool,
      `SELECT id, no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas, created_at
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

// ── FIX S5: Validasi sudah dilakukan di middleware validatePasien ──────────
const create = async (req, res) => {
  try {
    const { nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas, keterangan } = req.body;

    // Validasi tanggal — mencegah crash PostgreSQL dari string tidak valid
    if (tanggal_lahir && !isValidDate(tanggal_lahir))
      return badRequest(res, 'Format tanggal lahir tidak valid');

    const no_rm = (await pool.query('SELECT generate_no_rm() AS no_rm')).rows[0].no_rm;
    const { rows } = await pool.query(
      `INSERT INTO pasien(no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas, keterangan)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [no_rm, nama.trim(), tanggal_lahir || null, jenis_kelamin || null,
        alamat || null, no_telepon || null, kelas || null, keterangan || null]
    );
    return created(res, rows[0], 'Pasien berhasil didaftarkan');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pasienController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pasien tidak valid');

    const { nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas, keterangan } = req.body;

    if (!nama || !nama.trim()) return badRequest(res, 'Nama pasien wajib diisi');
    if (tanggal_lahir && !isValidDate(tanggal_lahir))
      return badRequest(res, 'Format tanggal lahir tidak valid');

    const { rows } = await pool.query(
      `UPDATE pasien SET nama=$1, tanggal_lahir=$2, jenis_kelamin=$3, alamat=$4,
              no_telepon=$5, kelas=$6, keterangan=$7
       WHERE id=$8 AND deleted_at IS NULL RETURNING *`,
      [nama.trim(), tanggal_lahir || null, jenis_kelamin || null,
        alamat || null, no_telepon || null, kelas || null, keterangan || null, id]
    );
    if (!rows.length) return notFound(res, 'Pasien tidak ditemukan');
    return success(res, rows[0], 'Data pasien berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'pasienController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID pasien tidak valid');

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
