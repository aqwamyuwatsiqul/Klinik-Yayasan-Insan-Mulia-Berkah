-- ============================================================
-- Migration 008: UNIQUE constraint pada kunjungan_tarif
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_kunjungan_tarif'
  ) THEN
    ALTER TABLE kunjungan_tarif
      ADD CONSTRAINT uq_kunjungan_tarif UNIQUE (kunjungan_id, tarif_id);
    RAISE NOTICE 'Constraint uq_kunjungan_tarif ditambahkan.';
  ELSE
    RAISE NOTICE 'Constraint uq_kunjungan_tarif sudah ada, skip.';
  END IF;
END $$;
