const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');
const { isValidDate } = require('../utils/validate');

const AKSI_VALID = ['LIHAT_REKAM_MEDIS', 'UBAH_IDENTITAS_PASIEN', 'VOID_PEMBAYARAN'];

const getAuditLog = async (req, res) => {
  try {
    const pg = parsePagination(req.query);
    const { user_id, aksi, tanggal_awal, tanggal_akhir, search } = req.query;

    if (aksi && !AKSI_VALID.includes(aksi))
      return badRequest(res, `aksi tidak valid. Pilih: ${AKSI_VALID.join(', ')}`);
    if (tanggal_awal  && !isValidDate(tanggal_awal))
      return badRequest(res, 'Format tanggal awal tidak valid');
    if (tanggal_akhir && !isValidDate(tanggal_akhir))
      return badRequest(res, 'Format tanggal akhir tidak valid');

    const conditions = [];
    const params     = [];

    if (user_id) {
      const uid = parseInt(user_id);
      if (!isNaN(uid)) { params.push(uid); conditions.push(`al.user_id=$${params.length}`); }
    }
    if (aksi) {
      params.push(aksi);
      conditions.push(`al.aksi=$${params.length}`);
    }
    if (tanggal_awal) {
      params.push(tanggal_awal);
      conditions.push(`al.created_at::date >= $${params.length}`);
    }
    if (tanggal_akhir) {
      params.push(tanggal_akhir);
      conditions.push(`al.created_at::date <= $${params.length}`);
    }
    if (search) {
      params.push(`%${String(search).trim()}%`);
      conditions.push(`(al.user_nama ILIKE $${params.length} OR al.deskripsi ILIKE $${params.length})`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await paginateQuery(
      pool,
      `SELECT al.id, al.aksi, al.entitas, al.entitas_id,
              al.user_id, al.user_nama, al.user_role,
              al.deskripsi, al.perubahan, al.ip_address, al.created_at
       FROM audit_log al
       ${where}
       ORDER BY al.created_at DESC`,
      params,
      pg
    );

    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'auditController.getAuditLog');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// Daftar user yang pernah punya entri audit (untuk dropdown filter)
const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT al.user_id, al.user_nama, al.user_role
       FROM audit_log al ORDER BY al.user_nama ASC`
    );
    return success(res, rows);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'auditController.getUsers');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAuditLog, getUsers };
