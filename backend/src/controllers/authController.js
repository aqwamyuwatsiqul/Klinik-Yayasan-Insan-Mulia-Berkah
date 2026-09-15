// ── Imports di top-level — jangan require() di dalam fungsi ──────────────
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const sharp      = require('sharp');
const pool       = require('../config/database');
const cloudinary = require('../config/cloudinary');
const logger     = require('../utils/logger');
const { success, unauthorized, badRequest } = require('../utils/response');

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
    const { nama, email, username } = req.body;
    if (!nama || !nama.trim() || nama.trim().length < 2)
      return badRequest(res, 'Nama wajib diisi minimal 2 karakter');

    // Validasi username jika diubah
    if (username !== undefined) {
      if (typeof username !== 'string' || !username.trim())
        return badRequest(res, 'Username tidak valid');
      const normalizedUsername = username.trim().toLowerCase();
      if (normalizedUsername.length < 3 || normalizedUsername.length > 50)
        return badRequest(res, 'Username harus 3–50 karakter');
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername))
        return badRequest(res, 'Username hanya boleh huruf, angka, dan underscore');
      // Cek duplikasi username dengan user lain
      const dupUsername = await pool.query(
        'SELECT id FROM users WHERE username=$1 AND id != $2 AND deleted_at IS NULL',
        [normalizedUsername, req.user.id]
      );
      if (dupUsername.rows.length) return badRequest(res, 'Username sudah digunakan akun lain');
      req.body.username = normalizedUsername; // simpan yang sudah dinormalisasi
    }

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

    const finalUsername = req.body.username ?? req.user.username;

    const { rows } = await pool.query(
      `UPDATE users SET nama=$1, email=$2, username=$3
       WHERE id=$4 AND deleted_at IS NULL
       RETURNING id, nama, username, role, email, foto_profil`,
      [nama.trim(), email || null, finalUsername, req.user.id]
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
// Upload foto profil ke Cloudinary.
//
// Alur:
//  1. Multer (memoryStorage) menyimpan file di req.file.buffer — tidak ada
//     file temporer di disk.
//  2. Sharp meresize + mengkonversi ke WebP 256×256 di memory.
//  3. Buffer hasil resize di-stream ke Cloudinary via upload_stream.
//  4. public_id = `klinik/profil/profil_${userId}` — Cloudinary otomatis
//     menimpa (overwrite) file lama dengan public_id yang sama, sehingga
//     tidak perlu kode hapus foto lama secara eksplisit.
//  5. URL HTTPS dari Cloudinary disimpan ke kolom foto_profil di database.
// ──────────────────────────────────────────────────────────────────────────
const uploadFotoProfil = async (req, res) => {
  try {
    if (!req.file?.buffer) return badRequest(res, 'File foto tidak ditemukan');

    // Resize + konversi ke WebP 256×256 di memory (tidak menyentuh disk)
    const webpBuffer = await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload ke Cloudinary via stream — public_id unik per user
    const publicId = `klinik/profil/profil_${req.user.id}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id     : publicId,
          resource_type : 'image',
          overwrite     : true,   // timpa foto profil lama secara otomatis
          invalidate    : true,   // purge CDN cache foto lama
          format        : 'webp',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(webpBuffer);
    });

    // Simpan URL HTTPS Cloudinary ke database
    const { rows } = await pool.query(
      'UPDATE users SET foto_profil=$1 WHERE id=$2 RETURNING id, nama, username, role, email, foto_profil',
      [uploadResult.secure_url, req.user.id]
    );

    logger.info({ userId: req.user.id, url: uploadResult.secure_url }, 'Foto profil diperbarui ke Cloudinary');
    return success(res, rows[0], 'Foto profil berhasil diperbarui');
  } catch (err) {
    logger.error({ err, userId: req.user?.id }, 'authController.uploadFotoProfil');
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
  }
};

module.exports = { login, me, changePassword, updateProfile, uploadFotoProfil };
