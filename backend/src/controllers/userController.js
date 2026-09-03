const bcrypt = require('bcryptjs');
const pool   = require('../config/database');
const logger = require('../utils/logger');
const { withTransaction } = require('../utils/db');
const { success, created, notFound, badRequest } = require('../utils/response');
const { parsePagination, paginateQuery } = require('../utils/pagination');

const getAll = async (req, res) => {
  try {
    const pg     = parsePagination(req.query);
    const search = (req.query.search || '').trim();
    const role   = req.query.role || '';

    const validRoles = ['admin', 'dokter', 'apoteker'];
    if (role && !validRoles.includes(role))
      return badRequest(res, 'Role filter tidak valid');

    const conditions = ['deleted_at IS NULL'];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(nama ILIKE $${params.length} OR username ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      conditions.push(`role=$${params.length}`);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    // M5 FIX: satu query dengan COUNT(*) OVER()
    const result = await paginateQuery(
      pool,
      `SELECT id, nama, username, role, email, aktif, created_at
       FROM users ${where} ORDER BY created_at DESC`,
      params,
      pg
    );

    return success(res, result);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.getAll');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID user tidak valid');

    const { rows } = await pool.query(
      'SELECT id, nama, username, role, email, aktif, created_at FROM users WHERE id=$1 AND deleted_at IS NULL',
      [id]
    );
    if (!rows.length) return notFound(res);
    return success(res, rows[0]);
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.getById');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const create = async (req, res) => {
  try {
    const { nama, username, password, role, email, aktif = true, spesialisasi } = req.body;

    if (typeof username !== 'string' && typeof username !== 'number')
      return badRequest(res, 'Username tidak valid');
    const normalizedUsername = String(username).trim().toLowerCase();

    // Cek duplikasi sebelum transaksi
    const dup = await pool.query(
      'SELECT id FROM users WHERE username=$1 AND deleted_at IS NULL', [normalizedUsername]
    );
    if (dup.rows.length) return badRequest(res, 'Username sudah digunakan');

    // M2 FIX: withTransaction — ROLLBACK aman
    const user = await withTransaction(pool, async (client) => {
      const hashed = await bcrypt.hash(password, 12);
      const { rows } = await client.query(
        `INSERT INTO users(nama, username, password, role, email, aktif)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING id, nama, username, role, email, aktif`,
        [nama.trim(), normalizedUsername, hashed, role, email || null, aktif]
      );
      if (role === 'dokter') {
        await client.query(
          `INSERT INTO dokter(user_id, nama, spesialisasi, aktif) VALUES($1,$2,$3,TRUE)`,
          [rows[0].id, nama.trim(), spesialisasi || 'Dokter Umum']
        );
      }
      return rows[0];
    });

    return created(res, user, 'User berhasil dibuat');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.create');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID user tidak valid');

    const { nama, email, role, aktif } = req.body;
    const validRoles = ['admin', 'dokter', 'apoteker'];

    if (!nama || !nama.trim()) return badRequest(res, 'Nama wajib diisi');
    if (role && !validRoles.includes(role)) return badRequest(res, 'Role tidak valid');

    const { rows } = await pool.query(
      `UPDATE users SET nama=$1, email=$2, role=$3, aktif=$4
       WHERE id=$5 AND deleted_at IS NULL
       RETURNING id, nama, username, role, email, aktif`,
      [nama.trim(), email || null, role, aktif !== undefined ? aktif : true, id]
    );
    if (!rows.length) return notFound(res);
    return success(res, rows[0], 'User berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.update');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID user tidak valid');

    const { password_baru } = req.body;
    if (!password_baru || password_baru.length < 8)
      return badRequest(res, 'Password baru minimal 8 karakter');

    const { rows } = await pool.query(
      'UPDATE users SET password=$1, password_changed_at=NOW() WHERE id=$2 AND deleted_at IS NULL RETURNING id',
      [await bcrypt.hash(password_baru, 12), id]
    );
    if (!rows.length) return notFound(res);
    return success(res, null, 'Password berhasil direset');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.resetPassword');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return badRequest(res, 'ID user tidak valid');
    if (id === req.user.id) return badRequest(res, 'Tidak dapat menghapus akun sendiri');

    const { rows } = await pool.query(
      'UPDATE users SET deleted_at=NOW(), aktif=FALSE WHERE id=$1 AND deleted_at IS NULL RETURNING id',
      [id]
    );
    if (!rows.length) return notFound(res);
    return success(res, null, 'User berhasil dihapus');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'userController.remove');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { getAll, getById, create, update, resetPassword, remove };
