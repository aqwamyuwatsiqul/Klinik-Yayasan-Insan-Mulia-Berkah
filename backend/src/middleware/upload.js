const multer = require('multer');

// Gunakan memoryStorage — file tidak ditulis ke disk sama sekali.
// Buffer tersedia di req.file.buffer, siap diteruskan ke Cloudinary.
// Ini menghilangkan masalah ephemeral filesystem di Render Free tier.
const storage = multer.memoryStorage();

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
