require('dotenv').config();

// M8 FIX: gunakan pino untuk startup fatal — bukan console.error
// Logger harus di-require SETELAH dotenv.config() agar level env terbaca
const startupLogger = require('pino')({ level: 'fatal' });

// ── Validasi env kritis sebelum apapun dijalankan ──────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  startupLogger.fatal('JWT_SECRET tidak di-set atau terlalu pendek (minimal 32 karakter). Tambahkan ke .env lalu restart.');
  process.exit(1);
}
if (!process.env.DB_PASSWORD && process.env.NODE_ENV === 'production') {
  startupLogger.fatal('DB_PASSWORD wajib di-set di production.');
  process.exit(1);
}

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const compression = require('compression');
const logger     = require('./utils/logger');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Kompresi Gzip/Brotli (Pilar 3) ────────────────────────────────────────
// Kompres semua response text (JSON, HTML, CSS, JS) sebelum dikirim ke client.
// Mempercepat TTFB secara signifikan — response JSON bisa berkurang 60-80%.
app.use(compression({
  level  : 6,        // level kompresi 1-9 (6 = titik terbaik antara kecepatan & rasio)
  threshold: 1024,   // hanya kompres respons > 1KB (kecil tidak perlu dikompres)
  filter : (req, res) => {
    // Jangan kompres jika client tidak support (rare, tapi aman)
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// ── Security headers lengkap (Pilar 4) ────────────────────────────────────
app.use(helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc  : ["'self'"],
      scriptSrc   : ["'self'"],
      styleSrc    : ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc     : ["'self'", 'https://fonts.gstatic.com'],
      imgSrc      : ["'self'", 'data:', 'blob:'],
      connectSrc  : ["'self'"],
      frameSrc    : ["'none'"],
      objectSrc   : ["'none'"],
      baseUri     : ["'self'"],
      formAction  : ["'self'"],
      // Upgrade HTTP ke HTTPS di browser (hanya production)
      ...(process.env.NODE_ENV === 'production'
        ? { upgradeInsecureRequests: [] }
        : {}),
    },
  },

  // HSTS: paksa HTTPS selama 1 tahun (hanya production)
  // Setelah header ini dikirim, browser tidak akan pernah buka HTTP lagi ke domain ini
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
    : false,

  // Mencegah clickjacking — halaman tidak bisa di-embed di iframe
  frameguard: { action: 'deny' },

  // Mencegah MIME sniffing — browser harus patuhi Content-Type yang dikirim server
  noSniff: true,

  // Menyembunyikan header X-Powered-By: Express
  hidePoweredBy: true,

  // Referrer Policy — batasi informasi referer yang dikirim
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // Matikan COEP karena bisa blokir font/gambar eksternal
  crossOriginEmbedderPolicy: false,

  // Permissions Policy — batasi fitur browser berbahaya
  // Diset manual di bawah karena helmet tidak punya API lengkap untuk ini
}));

// Permissions-Policy header (tidak di-cover helmet secara lengkap)
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  next();
});

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  startupLogger.fatal('FRONTEND_URL wajib di-set di production.');
  process.exit(1);
}

app.use(cors({
  origin: (origin, cb) => {
    // Izinkan request tanpa origin (Postman) hanya di non-production
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (origin && allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' tidak diizinkan`));
  },
  credentials: true,
}));

// ── Body parser dengan batas ukuran ───────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Rate limiter global ────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs : 15 * 60 * 1000, // 15 menit
  max      : 300,             // 300 req/IP/window
  standardHeaders: true,
  legacyHeaders  : false,
  message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' },
});
app.use(globalLimiter);

// ── Rate limiter ketat khusus login (anti brute-force) ────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max     : 10,              // maks 10 percobaan login per IP
  standardHeaders: true,
  legacyHeaders  : false,
  skipSuccessfulRequests: true, // percobaan sukses tidak dihitung
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' },
});
app.use('/api/auth/login', loginLimiter);

// ── Static files: foto profil ─────────────────────────────────────────────
// C2 FIX: /uploads TIDAK lagi public static.
// Akses foto profil hanya untuk user yang sudah login (authenticate).
// Validasi nama file: hanya hex32.webp yang diizinkan (format yang kita generate).
// Boundary check: path.resolve memastikan tidak ada path traversal.
const path = require('path');
const fs   = require('fs');
const { authenticate } = require('./middleware/auth');

const PROFIL_DIR = path.resolve(__dirname, '../uploads/profil');

app.get('/uploads/profil/:filename', authenticate, (req, res) => {
  const { filename } = req.params;

  // Validasi: hanya izinkan format yang kita generate sendiri (32 hex + .webp)
  if (!/^[a-f0-9]{32}\.webp$/.test(filename)) {
    return res.status(400).json({ success: false, message: 'File tidak valid' });
  }

  // Boundary check: pastikan resolved path benar-benar di dalam PROFIL_DIR
  const filePath = path.resolve(PROFIL_DIR, filename);
  if (!filePath.startsWith(PROFIL_DIR + path.sep)) {
    return res.status(403).json({ success: false, message: 'Akses ditolak' });
  }

  // Cek file ada di disk
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  // Set header cache yang aman: private (hanya browser user ini), 1 jam
  // Tambahkan ETag untuk conditional request (304 Not Modified)
  res.set({
    'Content-Type'           : 'image/webp',
    'Cache-Control'          : 'private, max-age=3600, must-revalidate',
    'X-Content-Type-Options' : 'nosniff',
    'Vary'                   : 'Authorization', // cache berbeda per user
  });
  res.sendFile(filePath);
});

// ── Display TV: endpoint publik antrian (tanpa auth, tanpa CSRF) ──────────
// Harus didaftarkan SEBELUM csrfProtection agar GET tidak butuh header CSRF.
// Rate limiter sendiri (lebih longgar dari global) karena TV polling tiap 15 det.
const tvLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max     : 30,        // 30 req/menit per IP (TV poll tiap 15 det = 4 req/mnt, margin x7)
  standardHeaders: true,
  legacyHeaders  : false,
  message: { success: false, message: 'Terlalu banyak permintaan' },
});
app.get(
  '/api/tv/antrian',
  tvLimiter,
  require('./controllers/kunjunganController').getAntrianPublik
);

// ── CSRF Protection ────────────────────────────────────────────────────────
// Semua mutasi (POST/PUT/PATCH/DELETE) wajib menyertakan header
// X-Requested-With: XMLHttpRequest — kecuali endpoint login.
const { csrfProtection } = require('./middleware/csrf');
app.use(csrfProtection);

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/pasien',      require('./routes/pasien'));
app.use('/api/dokter',      require('./routes/dokter'));
app.use('/api/kunjungan',   require('./routes/kunjungan'));
app.use('/api/rekam-medis', require('./routes/rekamMedis'));
app.use('/api/resep',       require('./routes/resep'));
app.use('/api/obat',        require('./routes/obat'));
app.use('/api/laporan',     require('./routes/laporan'));
app.use('/api/tarif',       require('./routes/tarif'));
app.use('/api/pembayaran',  require('./routes/pembayaran'));
app.use('/api/audit',       require('./routes/audit'));

// ── Health check ───────────────────────────────────────────────────────────
// L4 FIX: Di production, kembalikan respons minimal (tidak bocorkan timestamp
// atau info server). Di development tetap verbose untuk kemudahan debugging.
app.get('/api/health', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    // Hanya status 200 + teks "OK" — tidak ada info yang bisa dipakai attacker
    return res.status(200).send('OK');
  }
  // Development: tetap tampilkan detail untuk kemudahan debugging
  return res.json({ success: true, status: 'ok', time: new Date().toISOString() });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' })
);

// ── Global error handler ───────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Multer errors → 400 (bukan 500)
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ success: false, message: 'Ukuran file maksimal 2 MB' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE')
    return res.status(400).json({ success: false, message: 'Field file tidak valid' });
  if (err.message?.includes('Format file tidak didukung'))
    return res.status(400).json({ success: false, message: err.message });

  // CSRF error → 403
  if (err.message?.startsWith('CSRF:'))
    return res.status(403).json({ success: false, message: 'Permintaan tidak valid' });

  // Server errors → 500, jangan bocorkan detail
  logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
});

// ── Tangani promise rejection & exception yang tidak ter-catch ─────────────
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception — server akan dimatikan');
  process.exit(1);
});

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Klinik API berjalan di http://localhost:${PORT}/api/health`);
  logger.info(`ENV: ${process.env.NODE_ENV || 'development'}`);
});
