-- ============================================================
-- Reset Total Database — Hapus semua data, jaga struktur
-- Urutan: anak dulu sebelum induk (respek foreign key)
-- ============================================================

-- ── Data transaksi & audit ────────────────────────────────
TRUNCATE TABLE audit_log          RESTART IDENTITY CASCADE;
TRUNCATE TABLE pembayaran_item    RESTART IDENTITY CASCADE;
TRUNCATE TABLE pembayaran         RESTART IDENTITY CASCADE;
TRUNCATE TABLE kunjungan_tarif    RESTART IDENTITY CASCADE;
TRUNCATE TABLE stok_log           RESTART IDENTITY CASCADE;
TRUNCATE TABLE resep_item         RESTART IDENTITY CASCADE;
TRUNCATE TABLE resep              RESTART IDENTITY CASCADE;
TRUNCATE TABLE rekam_medis        RESTART IDENTITY CASCADE;
TRUNCATE TABLE kunjungan          RESTART IDENTITY CASCADE;

-- ── Master data klinik ────────────────────────────────────
TRUNCATE TABLE tarif_layanan      RESTART IDENTITY CASCADE;
TRUNCATE TABLE obat               RESTART IDENTITY CASCADE;
TRUNCATE TABLE pasien             RESTART IDENTITY CASCADE;

-- ── Data users & dokter ───────────────────────────────────
TRUNCATE TABLE dokter             RESTART IDENTITY CASCADE;
TRUNCATE TABLE users              RESTART IDENTITY CASCADE;

-- ── Reset sequences ke awal ──────────────────────────────
ALTER SEQUENCE no_rm_seq     RESTART WITH 1;
ALTER SEQUENCE kode_obat_seq RESTART WITH 1;
ALTER SEQUENCE kode_tarif_seq RESTART WITH 1;

DO $$ BEGIN
  RAISE NOTICE 'Reset selesai — semua tabel bersih.';
END $$;
