-- ============================================================
-- Migration 004: Modul Kasir / Pembayaran
-- ============================================================
-- Perubahan:
--   1. Tambah status 'menunggu_bayar' ke kunjungan.status CHECK
--   2. Tambah kolom harga_satuan ke resep_item (snapshot harga)
--   3. Buat sequence + tabel tarif_layanan
--   4. Buat tabel pembayaran
--   5. Buat tabel pembayaran_item
--   6. Index baru untuk query kasir
-- Semua perubahan ADDITIVE — data existing tidak rusak.
-- ============================================================

-- ── 1. Perluas CHECK constraint status kunjungan ─────────────
-- Pola identik dengan migration 002 (role constraint)
DO $$
BEGIN
  ALTER TABLE kunjungan DROP CONSTRAINT IF EXISTS kunjungan_status_check;
  ALTER TABLE kunjungan ADD CONSTRAINT kunjungan_status_check
    CHECK (status IN ('menunggu','diperiksa','menunggu_bayar','selesai','batal'));
  RAISE NOTICE 'CHECK constraint kunjungan.status diperluas dengan menunggu_bayar';
END $$;

-- ── 2. Snapshot harga di resep_item ──────────────────────────
-- NULL untuk item resep lama (sebelum modul ini aktif),
-- terisi otomatis oleh resepController.konfirmasi mulai sekarang.
ALTER TABLE resep_item
  ADD COLUMN IF NOT EXISTS harga_satuan NUMERIC(12,2) DEFAULT NULL;

-- ── 3. Sequence + tabel tarif layanan ────────────────────────
CREATE SEQUENCE IF NOT EXISTS kode_tarif_seq START 1;

CREATE TABLE IF NOT EXISTS tarif_layanan (
    id           SERIAL PRIMARY KEY,
    kode_tarif   VARCHAR(10)   NOT NULL UNIQUE,   -- TRF-XXXXX, auto-generate
    nama         VARCHAR(100)  NOT NULL,
    jenis        VARCHAR(50),                      -- 'Konsultasi', 'Tindakan', dll
    harga        NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- NULL  = berlaku untuk semua jenis pasien
    -- 'siswa' / 'umum' = tarif khusus
    jenis_pasien VARCHAR(10)   DEFAULT NULL
                 CHECK (jenis_pasien IS NULL OR jenis_pasien IN ('siswa','umum')),
    aktif        BOOLEAN       NOT NULL DEFAULT TRUE,
    keterangan   TEXT,
    created_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP     NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

-- Trigger updated_at untuk tarif_layanan
DROP TRIGGER IF EXISTS trg_tarif_layanan_updated ON tarif_layanan;
CREATE TRIGGER trg_tarif_layanan_updated
  BEFORE UPDATE ON tarif_layanan
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function generate kode tarif (pola sama dengan generate_kode_obat)
CREATE OR REPLACE FUNCTION generate_kode_tarif() RETURNS VARCHAR AS $$
BEGIN
  RETURN 'TRF-' || LPAD(NEXTVAL('kode_tarif_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ── 4. Tabel pembayaran ───────────────────────────────────────
-- Satu record per kunjungan. Dibuat saat kasir proses bayar.
-- Tidak ada deleted_at — soft-cancel menggunakan status 'void'.
CREATE TABLE IF NOT EXISTS pembayaran (
    id              SERIAL PRIMARY KEY,
    kunjungan_id    INTEGER       NOT NULL UNIQUE REFERENCES kunjungan(id),
    pasien_id       INTEGER       NOT NULL REFERENCES pasien(id),
    total_tagihan   NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_bayar     NUMERIC(12,2),           -- NULL sampai lunas
    kembalian       NUMERIC(12,2),
    metode_bayar    VARCHAR(20)
                    CHECK (metode_bayar IS NULL OR metode_bayar IN ('tunai','transfer','bpjs')),
    status          VARCHAR(20)   NOT NULL DEFAULT 'lunas'
                    CHECK (status IN ('lunas','void')),
    kasir_id        INTEGER       REFERENCES users(id),
    waktu_bayar     TIMESTAMP,
    catatan         TEXT,
    -- Void fields
    void_oleh       INTEGER       REFERENCES users(id),
    waktu_void      TIMESTAMP,
    alasan_void     TEXT,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Trigger updated_at untuk pembayaran
DROP TRIGGER IF EXISTS trg_pembayaran_updated ON pembayaran;
CREATE TRIGGER trg_pembayaran_updated
  BEFORE UPDATE ON pembayaran
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. Tabel pembayaran_item (rincian tagihan) ────────────────
-- Snapshot transparan per item: tarif layanan + obat dari resep.
CREATE TABLE IF NOT EXISTS pembayaran_item (
    id              SERIAL PRIMARY KEY,
    pembayaran_id   INTEGER       NOT NULL REFERENCES pembayaran(id),
    jenis           VARCHAR(20)   NOT NULL
                    CHECK (jenis IN ('tarif','obat')),
    referensi_id    INTEGER,      -- tarif_layanan.id atau obat.id
    nama            VARCHAR(200)  NOT NULL,    -- snapshot nama saat bayar
    harga_satuan    NUMERIC(12,2) NOT NULL,
    jumlah          INTEGER       NOT NULL DEFAULT 1,
    subtotal        NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── 6. Index ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tarif_aktif
  ON tarif_layanan(aktif) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tarif_jenis_pasien
  ON tarif_layanan(jenis_pasien) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pembayaran_kunjungan
  ON pembayaran(kunjungan_id);

CREATE INDEX IF NOT EXISTS idx_pembayaran_status
  ON pembayaran(status);

CREATE INDEX IF NOT EXISTS idx_pembayaran_waktu
  ON pembayaran(waktu_bayar DESC) WHERE waktu_bayar IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pembayaran_item_pembayaran
  ON pembayaran_item(pembayaran_id);

-- Index untuk antrian kasir: kunjungan menunggu_bayar hari ini
CREATE INDEX IF NOT EXISTS idx_kunjungan_menunggu_bayar
  ON kunjungan(tanggal, status)
  WHERE status = 'menunggu_bayar' AND deleted_at IS NULL;

DO $$
BEGIN
  RAISE NOTICE 'Migration 004 selesai: modul pembayaran siap.';
END $$;
