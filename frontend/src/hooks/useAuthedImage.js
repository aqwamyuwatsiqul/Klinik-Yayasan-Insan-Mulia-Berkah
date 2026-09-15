/**
 * useAuthedImage — hook untuk menampilkan foto profil.
 *
 * Sejak migrasi ke Cloudinary, URL foto profil adalah URL publik HTTPS
 * dari CDN Cloudinary (disimpan lengkap di kolom foto_profil di database).
 * Tidak ada lagi kebutuhan fetch dengan Bearer token.
 *
 * Hook ini tetap dipertahankan sebagai abstraksi tipis agar komponen
 * yang memakainya tidak perlu diubah — cukup terima `src` yang siap pakai.
 *
 * Perilaku:
 * - Jika `fotoProfil` adalah URL lengkap (https://...) → kembalikan langsung
 * - Jika null/undefined/kosong → kembalikan null (komponen tampilkan avatar default)
 * - Backward compat: jika masih ada nama file lama (format hex.webp) dari
 *   data sebelum migrasi, susun URL via path relatif /uploads/profil/:filename
 *   agar foto lama tetap tampil setelah upgrade.
 */

const CLOUDINARY_PREFIX = 'https://res.cloudinary.com/';
const LEGACY_FILENAME   = /^[a-f0-9]{32}\.webp$/;

/**
 * Tidak ada lagi cache blob — URL Cloudinary langsung bisa jadi src <img>.
 * Fungsi ini dipertahankan agar kode yang masih memanggil invalidateAuthedImage
 * tidak error (no-op sekarang).
 */
export function invalidateAuthedImage() {
  // no-op sejak migrasi Cloudinary — URL sudah unik per-upload via overwrite
}

/**
 * @param {string|null} fotoProfil — nilai dari user.foto_profil
 * @returns {string|null} — URL siap pakai untuk src <img>, atau null
 */
export default function useAuthedImage(fotoProfil) {
  if (!fotoProfil) return null;

  // URL Cloudinary lengkap — langsung kembalikan
  if (fotoProfil.startsWith(CLOUDINARY_PREFIX) || fotoProfil.startsWith('https://')) {
    return fotoProfil;
  }

  // Backward compat: nama file lama (sebelum migrasi Cloudinary)
  // Masih bisa tampil selama file belum dihapus dari disk lama.
  // Ikut pakai VITE_BACKEND_URL agar request mengarah ke backend yang benar
  // saat frontend di-deploy sebagai static site terpisah.
  if (LEGACY_FILENAME.test(fotoProfil)) {
    const backendBase = import.meta.env.VITE_BACKEND_URL || '';
    return `${backendBase}/uploads/profil/${fotoProfil}`;
  }

  return null;
}
