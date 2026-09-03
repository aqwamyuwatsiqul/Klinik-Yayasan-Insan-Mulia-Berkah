import { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * Instance axios khusus untuk fetch file (tanpa baseURL /api).
 * Endpoint foto profil ada di /uploads/profil/:filename, bukan di /api/...
 * Token Bearer tetap disertakan via interceptor yang sama.
 */
const fileApi = axios.create({ timeout: 15000 });
fileApi.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Cache blob URL per path.
 * Nama file di server selalu berubah (random hex) tiap kali user upload ulang,
 * tapi invalidasi eksplisit tetap tersedia via `invalidateAuthedImage(path)`
 * untuk kasus upload dalam sesi yang sama tanpa navigasi.
 */
const blobCache = new Map();

/**
 * Hapus cache entry untuk path tertentu.
 * Panggil ini sebelum memanggil onUploaded() setelah upload foto baru agar
 * hook langsung fetch ulang dari server dengan nama file yang baru.
 */
export function invalidateAuthedImage(path) {
  if (!path) return;
  const existing = blobCache.get(path);
  if (existing) {
    URL.revokeObjectURL(existing);
    blobCache.delete(path);
  }
}

/**
 * Fetch gambar yang butuh Authorization header lewat axios,
 * lalu kembalikan blob URL yang bisa langsung dipakai sebagai `src` <img>.
 *
 * @param {string|null} path  — URL path relatif, mis. "/uploads/profil/abc.webp"
 * @returns {string|null}     — blob URL saat sudah dimuat, null saat loading/error
 */
export default function useAuthedImage(path) {
  const [url, setUrl] = useState(
    () => (path && blobCache.has(path) ? blobCache.get(path) : null),
  );

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }

    // Sudah ada di cache — langsung pakai, tidak perlu fetch ulang
    if (blobCache.has(path)) {
      setUrl(blobCache.get(path));
      return;
    }

    let cancelled = false;

    fileApi
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(res.data);
        blobCache.set(path, objectUrl);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
