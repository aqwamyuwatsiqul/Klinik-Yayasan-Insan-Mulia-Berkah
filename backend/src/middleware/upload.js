const multer  = require('multer');
const path    = require('path');
const crypto  = require('crypto');

// Simpan ke disk — folder uploads/profil
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/profil'));
  },
  filename: (_req, file, cb) => {
    // Nama acak agar tidak bisa ditebak + ekstensi asli
    const rand = crypto.randomBytes(16).toString('hex');
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `${rand}${ext}`);
  },
});

// Filter: hanya gambar jpg/jpeg/png/webp, maks 2 MB
const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, atau WebP.'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

module.exports = upload;
