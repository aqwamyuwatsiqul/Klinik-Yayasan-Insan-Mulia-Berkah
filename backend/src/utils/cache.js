/**
 * Cache in-memory sederhana dengan TTL per key.
 *
 * M6 FIX: getDashboard dipanggil setiap 60 detik per user aktif.
 * Dengan cache, semua user berbagi satu hasil query selama 60 detik.
 * 10 user aktif = 10 request/menit → 1 set query/menit (hemat 90% query).
 *
 * Catatan:
 * - Cache ini per-process, tidak di-share antar instance (tidak cocok untuk cluster).
 *   Untuk multi-instance gunakan Redis.
 * - Tidak ada persistent storage — hilang saat server restart (aman).
 */

const store = new Map();

/**
 * Ambil nilai dari cache.
 * @returns {any|null} nilai jika ada dan belum expired, null jika tidak ada/expired
 */
const get = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Simpan nilai ke cache dengan TTL.
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlMs - Time-to-live dalam milidetik
 */
const set = (key, value, ttlMs) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

/**
 * Hapus key dari cache (untuk invalidasi manual).
 */
const del = (key) => { store.delete(key); };

/**
 * Bersihkan semua entry yang sudah expired.
 * Dipanggil periodik agar Map tidak terus tumbuh.
 */
const cleanup = () => {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.expiresAt) store.delete(k);
  }
};

// Bersihkan cache expired setiap 5 menit
setInterval(cleanup, 5 * 60 * 1000).unref(); // .unref() agar tidak menghalangi process exit

module.exports = { get, set, del };
