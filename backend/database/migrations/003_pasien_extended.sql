-- ============================================================
-- Migration 003: Extend Tabel Pasien
-- Mendukung dua jenis pasien: siswa sekolah dan umum.
-- Semua kolom baru menggunakan DEFAULT NULL (atau 'siswa') agar
-- data pasien yang sudah ada TIDAK RUSAK dan tetap valid.
-- ============================================================

-- ── 1. Jenis pasien ──────────────────────────────────────────
-- Default 'siswa' karena seluruh data existing adalah siswa
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS jenis_pasien VARCHAR(10)
    NOT NULL DEFAULT 'siswa'
    CHECK (jenis_pasien IN ('siswa', 'umum'));

-- ── 2. Identitas siswa ────────────────────────────────────────
-- Nomor Induk Siswa — opsional, hanya relevan untuk jenis_pasien='siswa'
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS nis VARCHAR(20) DEFAULT NULL;

-- ── 3. Identitas pasien umum ─────────────────────────────────
-- NIK (Nomor Induk Kependudukan) — 16 digit, opsional
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS nik VARCHAR(20) DEFAULT NULL;

-- ── 4. Kontak wali / orang tua (penting untuk darurat) ────────
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS nama_wali     VARCHAR(100) DEFAULT NULL;
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS telepon_wali  VARCHAR(20)  DEFAULT NULL;
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS hubungan_wali VARCHAR(30)  DEFAULT NULL;

-- ── 5. Riwayat kesehatan penting ─────────────────────────────
-- Tampilkan MENONJOL di halaman detail — kritis saat kondisi darurat
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS alergi         TEXT DEFAULT NULL;
ALTER TABLE pasien
  ADD COLUMN IF NOT EXISTS kondisi_khusus TEXT DEFAULT NULL;

-- ── Index baru ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pasien_jenis
  ON pasien(jenis_pasien) WHERE deleted_at IS NULL;

-- Index untuk cari pasien punya alergi/kondisi khusus
-- (partial index — hanya row yang benar-benar ada nilainya)
CREATE INDEX IF NOT EXISTS idx_pasien_alergi
  ON pasien(id) WHERE alergi IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pasien_kondisi
  ON pasien(id) WHERE kondisi_khusus IS NOT NULL AND deleted_at IS NULL;

-- ── Verifikasi ────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'Migration 003 selesai: tabel pasien diperluas dengan % kolom baru.',
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'pasien'
       AND column_name IN (
         'jenis_pasien','nis','nik',
         'nama_wali','telepon_wali','hubungan_wali',
         'alergi','kondisi_khusus'
       ));
END $$;
