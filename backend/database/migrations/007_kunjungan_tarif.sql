-- ============================================================
-- Migration 007: Tabel kunjungan_tarif
-- Menyimpan tarif layanan yang dipilih dokter saat menutup
-- kunjungan (selesaikanKunjungan). Kasir mengambil data ini
-- saat membuka halaman proses bayar sebagai tarif awal.
-- ============================================================

CREATE TABLE IF NOT EXISTS kunjungan_tarif (
    id            SERIAL PRIMARY KEY,
    kunjungan_id  INTEGER NOT NULL REFERENCES kunjungan(id),
    tarif_id      INTEGER NOT NULL REFERENCES tarif_layanan(id),
    dipilih_oleh  INTEGER REFERENCES users(id),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kunjungan_tarif_kunjungan
    ON kunjungan_tarif(kunjungan_id);

DO $$ BEGIN
  RAISE NOTICE 'Migration 007 selesai: tabel kunjungan_tarif siap.';
END $$;
