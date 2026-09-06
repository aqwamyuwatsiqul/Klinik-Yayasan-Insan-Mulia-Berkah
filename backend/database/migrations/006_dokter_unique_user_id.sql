-- ============================================================
-- Migration 006: Bersihkan duplikat dokter + UNIQUE constraint
-- ============================================================
-- Root cause: tabel dokter tidak punya UNIQUE constraint pada
-- user_id, sehingga ON CONFLICT di seed tidak pernah terpicu
-- dan setiap npm run seed menambahkan baris baru.
--
-- Langkah:
--   1. Hapus semua baris duplikat — sisakan baris terbaru per user_id
--      (terbaru = id terbesar, karena SERIAL selalu naik)
--   2. Hapus baris dokter yang user_id-nya NULL dan duplikat
--   3. Tambah UNIQUE constraint pada user_id (nullable-safe)
-- ============================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN

  -- ── 1. Hapus duplikat berdasarkan user_id ───────────────────
  -- Untuk setiap user_id yang muncul lebih dari sekali,
  -- pertahankan baris dengan id TERBESAR (paling baru),
  -- soft-delete sisanya.
  WITH ranked AS (
    SELECT id,
           user_id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id
             ORDER BY id DESC   -- id terbesar = paling baru
           ) AS rn
    FROM dokter
    WHERE user_id IS NOT NULL
      AND deleted_at IS NULL
  )
  UPDATE dokter
  SET deleted_at = NOW()
  WHERE id IN (
    SELECT id FROM ranked WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Duplikat dokter (user_id tidak NULL) di-soft-delete: % baris', deleted_count;

  -- ── 2. Tambah UNIQUE constraint ────────────────────────────
  -- Partial unique index: hanya baris aktif (deleted_at IS NULL)
  -- yang harus unik per user_id.
  -- Menggunakan CREATE UNIQUE INDEX karena ALTER TABLE ADD UNIQUE
  -- tidak mendukung WHERE clause (partial index).
  -- IF NOT EXISTS agar idempotent.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_dokter_user_id_unique
    ON dokter(user_id)
    WHERE user_id IS NOT NULL AND deleted_at IS NULL;

  RAISE NOTICE 'UNIQUE partial index idx_dokter_user_id_unique berhasil dibuat';

END $$;
