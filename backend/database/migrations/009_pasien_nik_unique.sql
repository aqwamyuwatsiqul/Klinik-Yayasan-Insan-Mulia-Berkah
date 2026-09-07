-- ============================================================
-- Migration 009: Partial UNIQUE index untuk NIK pasien
-- ============================================================
-- NIK seharusnya unik per orang — dua pasien tidak boleh punya
-- NIK yang sama. Menggunakan partial index agar:
--   1. NULL tidak dianggap duplikat (pasien tanpa NIK tetap bisa)
--   2. Pasien soft-deleted tidak memblokir pendaftaran ulang
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_pasien_nik_unique
  ON pasien(nik)
  WHERE nik IS NOT NULL AND deleted_at IS NULL;

DO $$ BEGIN
  RAISE NOTICE 'Migration 009 selesai: unique index NIK pasien siap.';
END $$;
