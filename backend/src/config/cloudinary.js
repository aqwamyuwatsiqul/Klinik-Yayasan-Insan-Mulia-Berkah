const { v2: cloudinary } = require('cloudinary');

// Konfigurasi diambil dari environment variables.
// Set di .env (development) atau Render dashboard (production).
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
