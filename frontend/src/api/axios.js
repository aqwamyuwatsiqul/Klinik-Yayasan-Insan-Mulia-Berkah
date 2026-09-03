import axios from 'axios';
import axiosRetry from 'axios-retry';

/**
 * Instance Axios utama.
 *
 * Header X-Requested-With: XMLHttpRequest → CSRF protection.
 *
 * M3 FIX: Retry otomatis untuk network error transien (koneksi terputus
 * sebentar saat deploy rolling, restart server, dll).
 * Hanya GET yang di-retry — mutasi (POST/PUT/PATCH/DELETE) TIDAK di-retry
 * karena idempotency tidak terjamin.
 */
const api = axios.create({
  baseURL : '/api',
  timeout : 15000,
  headers : {
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection (C4)
  },
});

// ── M3: Retry logic ────────────────────────────────────────────────────────
axiosRetry(api, {
  retries    : 2,           // maks 2 kali retry (total 3 percobaan)
  retryDelay : (count) => count * 800,  // 800ms, 1600ms (exponential sederhana)

  retryCondition: (err) => {
    const method = err.config?.method?.toUpperCase();

    // Hanya retry GET — mutasi tidak di-retry (tidak idempoten)
    if (method !== 'GET') return false;

    // Retry jika: network error (ECONNRESET, ETIMEDOUT, dll)
    if (axiosRetry.isNetworkError(err)) return true;

    // Retry jika server error 5xx (bukan 4xx yang merupakan kesalahan client)
    if (err.response?.status >= 500) return true;

    return false;
  },
});

// ── Inject Bearer token dari sessionStorage ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Tangani response error ─────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        sessionStorage.setItem('redirect_after_login', currentPath);
        window.location.replace('/login?session=expired');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
