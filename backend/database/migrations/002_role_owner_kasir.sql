-- ============================================================
-- Migration 002: Tambah Role Owner & Kasir
-- ============================================================
-- Memperluas CHECK constraint kolom `role` di tabel users
-- dari 3 nilai ('admin','dokter','apoteker') menjadi 5 nilai
-- dengan penambahan 'owner' dan 'kasir'.
--
-- PostgreSQL tidak mendukung ALTER CHECK secara langsung;
-- cara yang benar: DROP constraint lama, ADD constraint baru.
-- Menggunakan IF EXISTS agar idempotent (aman dijalankan ulang).
-- ============================================================

DO $$
BEGIN
  -- Cari dan drop constraint CHECK role yang ada
  -- (nama constraint bisa berbeda tergantung versi migration sebelumnya)
  ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

  -- Tambah constraint baru yang mencakup 5 role
  ALTER TABLE users
    ADD CONSTRAINT users_role_check
    CHECK (role IN ('admin', 'dokter', 'apoteker', 'owner', 'kasir'));

  RAISE NOTICE 'CHECK constraint role berhasil diperbarui';
END $$;
