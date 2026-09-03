const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();

    const conditions = ['d.deleted_at IS NULL'];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(d.nama ILIKE $${params.length} OR d.spesialisasi ILIKE $${params.length})`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    // M5 FIX: paginateQuery — satu query COUNT(*) OVER() gantikan double round-trip
    const result = await paginateQuery(
      pool,
      `SELECT d.id, d.user_id, d.nama, d.spesialisasi, d.no_sip, d.telepon, d.aktif,
              u.username, u.email
       FROM dokter d LEFT JOIN users u ON d.user_id = u.id
       ${where} ORDER BY d.nama ASC`,
      params,
      pg
    );

    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'dokterController.getAll');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID dokter tidak valid');

    const { rows } = await pool.query(
      `SELECT d.*, u.username, u.email
       FROM dokter d LEFT JOIN users u ON d.user_id = u.id
       WHERE d.id=$1 AND d.deleted_at IS NULL`,
      [id]
    );
    if (!rows.length) return notFound(res, 'Dokter tidak ditemukan');
    return success(res, rows[0]);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'dokterController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID dokter tidak valid');

    const { nama, spesialisasi, no_sip, telepon, aktif } = req.body;
    if (!nama || !nama.trim()) return badRequest(res, 'Nama dokter wajib diisi');

    const { rows } = await pool.query(
      `UPDATE dokter SET nama=$1, spesialisasi=$2, no_sip=$3, telepon=$4, aktif=$5
       WHERE id=$6 AND deleted_at IS NULL RETURNING *`,
      [nama.trim(), spesialisasi || null, no_sip || null, telepon || null,
        aktif !== undefined ? aktif : true, id]
    );
    if (!rows.length) return notFound(res, 'Dokter tidak ditemukan');
    return success(res, rows[0], 'Data dokter berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'dokterController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID dokter tidak valid');

    const { rows } = await pool.query(
      'UPDATE dokter SET deleted_at=NOW(), aktif=FALSE WHERE id=$1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    if (!rows.length) return notFound(res, 'Dokter tidak ditemukan');
    return success(res, null, 'Data dokter berhasil dihapus');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'dokterController.remove');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAll, getById, update, remove };
