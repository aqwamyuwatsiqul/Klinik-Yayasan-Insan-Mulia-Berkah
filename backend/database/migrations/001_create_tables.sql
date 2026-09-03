-- ============================================================
-- Sistem Informasi Klinik Sekolah
-- Migration 001: Create All Tables
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    nama        VARCHAR(100) NOT NULL,
    username    VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('admin','dokter','apoteker')),
    email       VARCHAR(100),
    foto_profil          VARCHAR(255) DEFAULT NULL,
    password_changed_at  TIMESTAMP    DEFAULT NULL,
    aktif       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMP
);

-- ── dokter ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dokter (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    nama         VARCHAR(100) NOT NULL,
    spesialisasi VARCHAR(100),
    no_sip       VARCHAR(50),
    telepon      VARCHAR(20),
    aktif        BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP
);

-- ── pasien ───────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS no_rm_seq START 1;

CREATE TABLE IF NOT EXISTS pasien (
    id             SERIAL PRIMARY KEY,
    no_rm          VARCHAR(20)  NOT NULL UNIQUE,
    nama           VARCHAR(100) NOT NULL,
    tanggal_lahir  DATE,
    jenis_kelamin  VARCHAR(10)  CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),
    alamat         TEXT,
    no_telepon     VARCHAR(20),
    kelas          VARCHAR(20),
    keterangan     TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP
);

-- ── obat ─────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS kode_obat_seq START 1;

CREATE TABLE IF NOT EXISTS obat (
    id                  SERIAL PRIMARY KEY,
    kode_obat           VARCHAR(20)    NOT NULL UNIQUE,
    nama                VARCHAR(100)   NOT NULL,
    jenis               VARCHAR(50),
    satuan              VARCHAR(20)    NOT NULL,
    stok                INTEGER        NOT NULL DEFAULT 0,
    stok_minimum        INTEGER        NOT NULL DEFAULT 10,
    harga               NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tanggal_kadaluarsa  DATE,
    keterangan          TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP
);

-- ── kunjungan ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kunjungan (
    id             SERIAL PRIMARY KEY,
    pasien_id      INTEGER NOT NULL REFERENCES pasien(id),
    dokter_id      INTEGER REFERENCES dokter(id),
    tanggal        DATE      NOT NULL DEFAULT CURRENT_DATE,
    waktu_daftar   TIMESTAMP NOT NULL DEFAULT NOW(),
    status         VARCHAR(20) NOT NULL DEFAULT 'menunggu'
                   CHECK (status IN ('menunggu','diperiksa','selesai','batal')),
    keluhan        TEXT,
    catatan_triage TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP
);

-- ── rekam_medis ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rekam_medis (
    id              SERIAL PRIMARY KEY,
    kunjungan_id    INTEGER NOT NULL UNIQUE REFERENCES kunjungan(id),
    pasien_id       INTEGER NOT NULL REFERENCES pasien(id),
    dokter_id       INTEGER NOT NULL REFERENCES dokter(id),
    tanggal_periksa TIMESTAMP NOT NULL DEFAULT NOW(),
    keluhan         TEXT,
    pemeriksaan     TEXT,
    diagnosa        TEXT,
    terapi          TEXT,
    catatan         TEXT,
    tekanan_darah   VARCHAR(20),
    suhu            NUMERIC(4,1),
    berat_badan     NUMERIC(5,2),
    tinggi_badan    NUMERIC(5,2),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- ── resep ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resep (
    id              SERIAL PRIMARY KEY,
    kunjungan_id    INTEGER NOT NULL REFERENCES kunjungan(id),
    rekam_medis_id  INTEGER REFERENCES rekam_medis(id),
    dokter_id       INTEGER NOT NULL REFERENCES dokter(id),
    pasien_id       INTEGER NOT NULL REFERENCES pasien(id),
    tanggal         TIMESTAMP NOT NULL DEFAULT NOW(),
    status          VARCHAR(20) NOT NULL DEFAULT 'menunggu'
                    CHECK (status IN ('menunggu','diproses','selesai','batal')),
    catatan         TEXT,
    diserahkan_oleh INTEGER REFERENCES users(id),
    waktu_serah     TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP
);

-- ── resep_item ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resep_item (
    id           SERIAL PRIMARY KEY,
    resep_id     INTEGER NOT NULL REFERENCES resep(id),
    obat_id      INTEGER NOT NULL REFERENCES obat(id),
    jumlah       INTEGER NOT NULL,
    dosis        VARCHAR(100),
    aturan_pakai VARCHAR(200),
    keterangan   TEXT,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── stok_log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stok_log (
    id             SERIAL PRIMARY KEY,
    obat_id        INTEGER NOT NULL REFERENCES obat(id),
    tipe           VARCHAR(20) NOT NULL CHECK (tipe IN ('masuk','keluar','koreksi')),
    jumlah         INTEGER NOT NULL,
    stok_sebelum   INTEGER NOT NULL,
    stok_sesudah   INTEGER NOT NULL,
    referensi_id   INTEGER,
    referensi_tipe VARCHAR(50),
    keterangan     TEXT,
    user_id        INTEGER REFERENCES users(id),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────
-- Partial indexes (WHERE deleted_at IS NULL) lebih efisien —
-- hanya mengindeks baris aktif, ukuran index jauh lebih kecil.

-- users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
  ON users(username) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower
  ON users(LOWER(email)) WHERE deleted_at IS NULL AND email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role) WHERE deleted_at IS NULL;

-- pasien
CREATE UNIQUE INDEX IF NOT EXISTS idx_pasien_no_rm
  ON pasien(no_rm) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pasien_nama
  ON pasien(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pasien_deleted
  ON pasien(deleted_at);

-- kunjungan
CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal
  ON kunjungan(tanggal) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kunjungan_status
  ON kunjungan(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kunjungan_pasien
  ON kunjungan(pasien_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kunjungan_dokter
  ON kunjungan(dokter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kunjungan_tanggal_status
  ON kunjungan(tanggal, status) WHERE deleted_at IS NULL;

-- rekam_medis
CREATE INDEX IF NOT EXISTS idx_rm_pasien
  ON rekam_medis(pasien_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rm_kunjungan
  ON rekam_medis(kunjungan_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rm_dokter
  ON rekam_medis(dokter_id) WHERE deleted_at IS NULL;

-- resep
CREATE INDEX IF NOT EXISTS idx_resep_status
  ON resep(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resep_pasien
  ON resep(pasien_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resep_dokter
  ON resep(dokter_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_resep_kunjungan
  ON resep(kunjungan_id) WHERE deleted_at IS NULL;

-- resep_item
CREATE INDEX IF NOT EXISTS idx_resep_item_resep
  ON resep_item(resep_id);
CREATE INDEX IF NOT EXISTS idx_resep_item_obat
  ON resep_item(obat_id);

-- obat
CREATE INDEX IF NOT EXISTS idx_obat_nama
  ON obat(nama) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obat_kode
  ON obat(kode_obat) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obat_stok
  ON obat(stok, stok_minimum) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_obat_kadaluarsa
  ON obat(tanggal_kadaluarsa) WHERE deleted_at IS NULL AND tanggal_kadaluarsa IS NOT NULL;

-- stok_log
CREATE INDEX IF NOT EXISTS idx_stok_log_obat
  ON stok_log(obat_id);
CREATE INDEX IF NOT EXISTS idx_stok_log_created
  ON stok_log(created_at DESC);

-- ── Trigger: auto updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','pasien','dokter','obat','kunjungan','rekam_medis','resep']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END $$;

-- ── Functions: generate kode ──────────────────────────────────
CREATE OR REPLACE FUNCTION generate_no_rm() RETURNS VARCHAR AS $$
DECLARE tahun TEXT; seq TEXT;
BEGIN
  tahun := TO_CHAR(NOW(), 'YYYY');
  seq   := LPAD(NEXTVAL('no_rm_seq')::TEXT, 5, '0');
  RETURN 'RM-' || tahun || '-' || seq;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_kode_obat() RETURNS VARCHAR AS $$
BEGIN
  RETURN 'OBT-' || LPAD(NEXTVAL('kode_obat_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;
