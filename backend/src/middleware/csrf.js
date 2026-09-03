/**
 * CSRF Protection Middleware
 *
 * Strategi: Custom Request Header (X-Requested-With).
 *
 * Cara kerja:
 *  - Browser TIDAK bisa mengirim custom header lintas origin via form HTML
 *    atau fetch biasa tanpa CORS preflight yang diizinkan.
 *  - Hanya JavaScript dari origin yang sama (atau yang diizinkan CORS) yang
 *    bisa menambahkan header ini.
 *  - Endpoint login dikecualikan karena belum ada token untuk dikirim.
 *  - GET dan HEAD tidak diproteksi (safe methods, tidak mengubah state).
 *
 * Referensi: OWASP CSRF Prevention Cheat Sheet — Custom Request Header
 */

const SAFE_METHODS       = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXCLUDED_PATHS     = new Set(['/api/auth/login']);
const REQUIRED_HEADER    = 'x-requested-with';
const REQUIRED_VALUE     = 'XMLHttpRequest';

const csrfProtection = (req, res, next) => {
  // Safe HTTP methods tidak perlu dilindungi
  if (SAFE_METHODS.has(req.method)) return next();

  // Path yang dikecualikan (login tidak punya token)
  if (EXCLUDED_PATHS.has(req.path)) return next();

  // Cek custom header
  const headerValue = req.headers[REQUIRED_HEADER];
  if (!headerValue || headerValue !== REQUIRED_VALUE) {
    return res.status(403).json({
      success : false,
      message : 'Permintaan tidak valid',
    });
  }

  next();
};

module.exports = { csrfProtection };
