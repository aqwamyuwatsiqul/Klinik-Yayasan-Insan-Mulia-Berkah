-- ============================================================
-- Migration 005: Tabel Audit Log
-- ============================================================
-- Mencatat aktivitas sensitif:
--   LIHAT_REKAM_MEDIS     — akses rekam medis oleh non-medis (admin/owner)
--   UBAH_IDENTITAS_PASIEN — perubahan NIK atau tanggal_lahir pasien
--   VOID_PEMBAYARAN       — void transaksi oleh owner
--
-- Tabel ini TIDAK memiliki deleted_at — catatan audit tidak boleh dihapus.
-- BIGSERIAL untuk id karena volume bisa besar (setiap akses view dicatat).
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     INTEGER      NOT NULL REFERENCES users(id),
    user_nama   VARCHAR(100) NOT NULL,   -- snapshot nama saat event terjadi
    user_role   VARCHAR(20)  NOT NULL,   -- snapshot role saat event terjadi
    aksi        VARCHAR(50)  NOT NULL
                CHECK (aksi IN ('LIHAT_REKAM_MEDIS','UBAH_IDENTITAS_PASIEN','VOID_PEMBAYARAN')),
    entitas     VARCHAR(50)  NOT NULL,   -- 'rekam_medis' | 'pasien' | 'pembayaran'
    entitas_id  INTEGER,                 -- ID record yang terdampak
    deskripsi   TEXT,                    -- narasi konteks bebas
    perubahan   JSONB,                   -- { field: [nilai_lama, nilai_baru] }
    ip_address  VARCHAR(45),             -- IPv4 atau IPv6
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Index untuk pola query filter di halaman audit owner
CREATE INDEX IF NOT EXISTS idx_audit_user
  ON audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_aksi
  ON audit_log(aksi);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entitas
  ON audit_log(entitas, entitas_id);

DO $$
BEGIN
  RAISE NOTICE 'Migration 005 selesai: tabel audit_log siap.';
END $$;
