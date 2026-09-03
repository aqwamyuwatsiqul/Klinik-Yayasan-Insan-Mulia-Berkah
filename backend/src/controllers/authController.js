// ── Imports di top-level — jangan require() di dalam fungsi ──────────────
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const pool   = require('../config/database');
const logger = require('../utils/logger');
const { success, unauthorized, badRequest } = require('../utils/response');

// Direktori upload — di-resolve sekali saat modul dimuat
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/profil');

// ── Helper: hapus file dengan aman (tidak crash jika tidak ada) ───────────
const safeUnlink = (filePath) => {
  try { fs.unlinkSync(filePath); } catch (e) {
    if (e.code !== 'ENOENT') logger.warn({ path: filePath, code: e.code }, 'Gagal hapus file');
  }
};

// ──────────────────────────────────────────────────────────────────────────
// FIX C3: Tidak ada lagi interpolasi nama kolom ke SQL.
// Dua query terpisah — nama kolom statis di kode, bukan dari input.
// ──────────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return badRequest(res, 'Email/username dan password wajib diisi');

    const normalizedInput = String(username).trim().toLowerCase().slice(0, 100);
    const isEmail         = normalizedInput.includes('@');

    // C3 FIX: dua query terpisah, tidak ada string interpolation pada nama kolom
    const { rows } = isEmail
      ? await pool.query(
          `SELECT id, nama, username, password, role, aktif, email, foto_profil
           FROM users WHERE LOWER(email) = $1 AND deleted_at IS NULL`,
          [normalizedInput]
        )
      : await pool.query(
          `SELECT id, nama, username, password, role, aktif, email, foto_profil
           FROM users WHERE username = $1 AND deleted_at IS NULL`,
          [normalizedInput]
        );

    // Anti timing attack: selalu jalankan bcrypt meski user tidak ditemukan
    if (!rows.length) {
      await bcrypt.compare(password, '$2a$12$dummyhashfordummycomparison00000000000000000');
      return unauthorized(res, 'Email/username atau password salah');
    }

    const user = rows[0];
    const ok   = await bcrypt.compare(password, user.password);
    if (!ok)        return unauthorized(res, 'Email/username atau password salah');
    if (!user.aktif) return unauthorized(res, 'Akun tidak aktif. Hubungi administrator.');

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    let dokter = null;
    if (user.role === 'dokter') {
      const dr = await pool.query(
        'SELECT id, spesialisasi, no_sip FROM dokter WHERE user_id=$1 AND deleted_at IS NULL',
        [user.id]
      );
      if (dr.rows.length) dokter = dr.rows[0];
    }

    logger.info({ userId: user.id, role: user.role }, 'Login berhasil');
    return success(res, {
      token,
      user: { id: user.id, nama: user.nama, username: user.username, role: user.role, email: user.email, foto_profil: user.foto_profil ?? null, dokter },
    }, 'Login berhasil');
  } catch (err) {
    logger.error({ err }, 'authController.login');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const me = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, nama, username, role, email, foto_profil, aktif FROM users WHERE id=$1 AND deleted_at IS NULL',
      [req.user.id]
    );
    if (!rows.length) return unauthorized(res, 'User tidak ditemukan');
    const userData = rows[0];

    let dokter = null;
    if (userData.role === 'dokter') {
      const dr = await pool.query(
        'SELECT id, spesialisasi, no_sip, telepon FROM dokter WHERE user_id=$1 AND deleted_at IS NULL',
        [userData.id]
      );
      if (dr.rows.length) dokter = dr.rows[0];
    }
    return success(res, { ...userData, dokter });
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'authController.me');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;
    if (!password_lama || !password_baru)
      return badRequest(res, 'Password lama dan baru wajib diisi');
    if (password_baru.length < 8)
      return badRequest(res, 'Password baru minimal 8 karakter');
    if (password_lama === password_baru)
      return badRequest(res, 'Password baru tidak boleh sama dengan password lama');

    const { rows } = await pool.query(
      'SELECT password FROM users WHERE id=$1 AND deleted_at IS NULL', [req.user.id]
    );
    if (!rows.length) return unauthorized(res, 'User tidak ditemukan');
    if (!await bcrypt.compare(password_lama, rows[0].password))
      return badRequest(res, 'Password lama salah');

    await pool.query(
      'UPDATE users SET password=$1, password_changed_at=NOW() WHERE id=$2',
      [await bcrypt.hash(password_baru, 12), req.user.id]
    );
    logger.info({ userId: req.user.id }, 'Password berhasil diubah');
    return success(res, null, 'Password berhasil diubah. Silakan login ulang.');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'authController.changePassword');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { nama, email } = req.body;
    if (!nama || !nama.trim() || nama.trim().length < 2)
      return badRequest(res, 'Nama wajib diisi minimal 2 karakter');

    // Validasi format email jika diisi
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email))    return badRequest(res, 'Format email tidak valid');
      if (email.length > 255)         return badRequest(res, 'Email terlalu panjang');

      // Cek duplikasi email dengan user lain
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(email)=$1 AND id != $2 AND deleted_at IS NULL',
        [email.toLowerCase(), req.user.id]
      );
      if (dup.rows.length) return badRequest(res, 'Email sudah digunakan akun lain');
    }

    const { rows } = await pool.query(
      `UPDATE users SET nama=$1, email=$2
       WHERE id=$3 AND deleted_at IS NULL
       RETURNING id, nama, username, role, email, foto_profil`,
      [nama.trim(), email || null, req.user.id]
    );
    if (!rows.length) return unauthorized(res, 'User tidak ditemukan');

    logger.info({ userId: req.user.id }, 'Profil diperbarui');
    return success(res, rows[0], 'Profil berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'authController.updateProfile');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

// ──────────────────────────────────────────────────────────────────────────
// FIX C1: Path traversal prevention pada upload foto profil.
//
// Masalah lama: outputName berasal dari req.file.filename yang bisa
// dimanipulasi attacker untuk menulis file di luar UPLOAD_DIR.
//
// Fix:
//  1. Generate nama output baru sepenuhnya dari crypto.randomBytes — tidak
//     bergantung req.file.filename sama sekali.
//  2. path.resolve() + startsWith(UPLOAD_DIR) memastikan output path
//     benar-benar berada di dalam direktori yang diizinkan.
//  3. path.basename() saat hapus foto lama — eliminasi komponen path.
// ──────────────────────────────────────────────────────────────────────────
const uploadFotoProfil = async (req, res) => {
  const inputPath = req.file?.path || null;

  try {
    if (!req.file || !inputPath) return badRequest(res, 'File foto tidak ditemukan');

    // C1 FIX 1: Nama output di-generate sepenuhnya secara independen dari input
    const safeName   = `${crypto.randomBytes(16).toString('hex')}.webp`;
    const outputPath = path.resolve(UPLOAD_DIR, safeName);

    // C1 FIX 2: Boundary check — pastikan output path di dalam UPLOAD_DIR
    if (!outputPath.startsWith(UPLOAD_DIR + path.sep)) {
      safeUnlink(inputPath);
      logger.warn({ userId: req.user.id }, 'Path traversal attempt pada upload foto');
      return badRequest(res, 'Nama file tidak valid');
    }

    // Pastikan direktori ada
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

    // Resize + konversi ke WebP (tidak pernah simpan file original)
    await sharp(inputPath)
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toFile(outputPath);

    // Hapus file upload asli setelah konversi berhasil
    safeUnlink(inputPath);

    // C1 FIX 3: Gunakan path.basename() saat hapus foto lama — eliminasi traversal
    const old = (await pool.query(
      'SELECT foto_profil FROM users WHERE id=$1', [req.user.id]
    )).rows[0];

    if (old?.foto_profil) {
      // Hanya ambil nama file (basename) — abaikan path dari DB
      const oldBase = path.basename(old.foto_profil);
      // Validasi: nama file hanya boleh hex.webp (format yang kita generate)
      if (/^[a-f0-9]{32}\.webp$/.test(oldBase)) {
        const oldPath = path.resolve(UPLOAD_DIR, oldBase);
        // Boundary check ulang untuk path lama
        if (oldPath.startsWith(UPLOAD_DIR + path.sep)) safeUnlink(oldPath);
      }
    }

    const { rows } = await pool.query(
      'UPDATE users SET foto_profil=$1 WHERE id=$2 RETURNING id, nama, username, role, email, foto_profil',
      [safeName, req.user.id]
    );

    logger.info({ userId: req.user.id }, 'Foto profil diperbarui');
    return success(res, rows[0], 'Foto profil berhasil diperbarui');
  } catch (err) {
    // Pastikan file upload dihapus jika ada error di tengah proses
    if (inputPath) safeUnlink(inputPath);
    logger.error({ err, userId: req.user?.id }, 'authController.uploadFotoProfil');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { login, me, changePassword, updateProfile, uploadFotoProfil };
