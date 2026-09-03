-- ============================================================
-- Seed Data: Users, Dokter, Pasien, Obat
-- Password semua akun: Password123!
-- bcrypt hash (cost 12) dari "Password123!"
-- ============================================================

ALTER SEQUENCE IF EXISTS no_rm_seq    RESTART WITH 6;
ALTER SEQUENCE IF EXISTS kode_obat_seq RESTART WITH 11;

-- ── Users ────────────────────────────────────────────────────
-- Hash bcrypt (cost 12) dari "Password123!" — digenerate ulang agar valid
INSERT INTO users (nama, username, password, role, email, aktif) VALUES
  ('Yuwatsiqul Aqwam',    'admin',     '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'admin',    'admin@klinik.sch.id',       TRUE),
  ('dr. Siti Rahayu',      'dokter1',   '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'dokter',   'siti.rahayu@klinik.sch.id', TRUE),
  ('dr. Budi Santoso',     'dokter2',   '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'dokter',   'budi.santoso@klinik.sch.id',TRUE),
  ('Farida Aprilia',       'apoteker1', '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'apoteker', 'farida@klinik.sch.id',      TRUE)
ON CONFLICT (username) DO NOTHING;

-- ── Dokter ───────────────────────────────────────────────────
INSERT INTO dokter (user_id, nama, spesialisasi, no_sip, telepon, aktif)
SELECT u.id, 'dr. Siti Rahayu', 'Dokter Umum', 'SIP/001/2024', '081234567890', TRUE
FROM users u WHERE u.username = 'dokter1'
ON CONFLICT DO NOTHING;

INSERT INTO dokter (user_id, nama, spesialisasi, no_sip, telepon, aktif)
SELECT u.id, 'dr. Budi Santoso', 'Dokter Umum', 'SIP/002/2024', '081234567891', TRUE
FROM users u WHERE u.username = 'dokter2'
ON CONFLICT DO NOTHING;

-- ── Pasien ───────────────────────────────────────────────────
INSERT INTO pasien (no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon, kelas) VALUES
  ('RM-2024-00001', 'Ahmad Fauzi',    '2008-03-15', 'Laki-laki', 'Jl. Merdeka No. 1',    '081111111111', 'X IPA 1'),
  ('RM-2024-00002', 'Dewi Sartika',   '2007-07-22', 'Perempuan', 'Jl. Pahlawan No. 5',   '082222222222', 'XI IPA 2'),
  ('RM-2024-00003', 'Rizki Pratama',  '2009-11-08', 'Laki-laki', 'Jl. Sudirman No. 10',  '083333333333', 'IX A'),
  ('RM-2024-00004', 'Siti Nurhaliza', '2008-05-30', 'Perempuan', 'Jl. Gajah Mada No. 3', '084444444444', 'X IPS 1'),
  ('RM-2024-00005', 'Bagas Setiawan', '2006-09-14', 'Laki-laki', 'Jl. Ahmad Yani No. 7', '085555555555', 'XII IPA 1')
ON CONFLICT (no_rm) DO NOTHING;

-- ── Obat ─────────────────────────────────────────────────────
INSERT INTO obat (kode_obat, nama, jenis, satuan, stok, stok_minimum, harga, tanggal_kadaluarsa) VALUES
  ('OBT-00001', 'Paracetamol 500mg',    'Analgesik',        'Tablet',  200, 20,  500,   '2026-12-31'),
  ('OBT-00002', 'Amoxicillin 500mg',    'Antibiotik',       'Kapsul',  150, 15, 1500,   '2026-06-30'),
  ('OBT-00003', 'Ibuprofen 400mg',      'Analgesik',        'Tablet',  100, 10,  800,   '2026-09-30'),
  ('OBT-00004', 'Antasida Doen',        'Antasida',         'Tablet',   80, 10,  300,   '2026-08-31'),
  ('OBT-00005', 'Cetirizine 10mg',      'Antihistamin',     'Tablet',  120, 15,  600,   '2026-11-30'),
  ('OBT-00006', 'Oralit',               'Rehidrasi Oral',   'Sachet',   60, 10, 2000,   '2026-07-31'),
  ('OBT-00007', 'Betadine Antiseptik',  'Antiseptik',       'Botol',    30,  5, 15000,  '2026-10-31'),
  ('OBT-00008', 'Vitamin C 500mg',      'Vitamin',          'Tablet',    5, 10,  400,   '2025-03-31'),
  ('OBT-00009', 'Salep Gentamicin',     'Antibiotik Topikal','Tube',    25,  5, 8000,   '2026-05-31'),
  ('OBT-00010', 'Rivanol',              'Antiseptik',       'Botol',     8, 10, 5000,   '2025-02-28')
ON CONFLICT (kode_obat) DO NOTHING;
