const jwt  = require('jsonwebtoken');
const pool = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * authenticate
 *
 * H1 FIX: Token JWT di-revoke otomatis jika password berubah setelah
 * token diterbitkan. Caranya:
 *  - Setiap kali password berubah, kolom `password_changed_at` di-update.
 *  - Di sini kita bandingkan `decoded.iat` (Unix timestamp saat token dibuat)
 *    dengan `password_changed_at`. Jika password berubah SETELAH token dibuat,
 *    token dianggap tidak valid.
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return unauthorized(res, 'Token tidak ditemukan');

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ambil data user + password_changed_at dari DB
    const { rows } = await pool.query(
      `SELECT id, nama, username, role, aktif, password_changed_at
       FROM users WHERE id=$1 AND deleted_at IS NULL`,
      [decoded.id]
    );

    if (!rows.length)    return unauthorized(res, 'Akun tidak ditemukan');
    if (!rows[0].aktif)  return unauthorized(res, 'Akun tidak aktif');

    // H1: Cek apakah password berubah SETELAH token ini diterbitkan
    const { password_changed_at } = rows[0];
    if (password_changed_at) {
      const tokenIssuedAt  = decoded.iat * 1000; // konversi ke ms
      const passwordChanged = new Date(password_changed_at).getTime();
      if (passwordChanged > tokenIssuedAt) {
        return unauthorized(res, 'Sesi tidak valid karena password telah diubah. Silakan login ulang.');
      }
    }

    // Simpan ke req.user tanpa password_changed_at (tidak perlu di downstream)
    const { password_changed_at: _pc, ...userWithoutSensitive } = rows[0];
    req.user = userWithoutSensitive;
    next();
  } catch (err) {
    return unauthorized(
      res,
      err.name === 'TokenExpiredError' ? 'Token kedaluwarsa' : 'Token tidak valid'
    );
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role))
    return forbidden(res, `Akses hanya untuk: ${roles.join(', ')}`);
  next();
};

module.exports = { authenticate, authorize };
