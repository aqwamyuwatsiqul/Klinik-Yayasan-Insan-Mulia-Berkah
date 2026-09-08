-- ============================================================
-- Seed Data Lengkap — E2E Testing
-- Semua password: Password123!
-- bcrypt hash (cost 12) dari "Password123!"
-- ============================================================

-- ── Sequences ────────────────────────────────────────────
ALTER SEQUENCE IF EXISTS no_rm_seq     RESTART WITH 11;
ALTER SEQUENCE IF EXISTS kode_obat_seq RESTART WITH 16;
ALTER SEQUENCE IF EXISTS kode_tarif_seq RESTART WITH 6;

-- ════════════════════════════════════════════════════════
-- USERS — semua 5 role
-- ════════════════════════════════════════════════════════
INSERT INTO users (nama, username, password, role, email, aktif) VALUES
  ('Yuwatsiqul Aqwam',   'owner',     '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'owner',    'owner@klinik.sch.id',        TRUE),
  ('Budi Raharjo',        'admin',     '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'admin',    'admin@klinik.sch.id',        TRUE),
  ('dr. Siti Rahayu',     'dokter1',   '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'dokter',   'siti.rahayu@klinik.sch.id',  TRUE),
  ('dr. Budi Santoso',    'dokter2',   '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'dokter',   'budi.santoso@klinik.sch.id', TRUE),
  ('Farida Aprilia',      'apoteker1', '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'apoteker', 'farida@klinik.sch.id',       TRUE),
  ('Rizal Firmansyah',    'kasir1',    '$2a$12$UB9qnnoFxB0yMlTM6.WPG./0H4dY9g.MCs1qHut.gEac3XYkaq1MC', 'kasir',    'kasir@klinik.sch.id',        TRUE)
ON CONFLICT (username) DO NOTHING;

-- ════════════════════════════════════════════════════════
-- DOKTER — profil terhubung ke user dokter
-- ════════════════════════════════════════════════════════
INSERT INTO dokter (user_id, nama, spesialisasi, no_sip, telepon, aktif)
SELECT u.id, 'dr. Siti Rahayu', 'Dokter Umum', 'SIP/001/2026', '081234567890', TRUE
FROM users u WHERE u.username = 'dokter1'
  AND NOT EXISTS (SELECT 1 FROM dokter WHERE user_id = u.id AND deleted_at IS NULL);

INSERT INTO dokter (user_id, nama, spesialisasi, no_sip, telepon, aktif)
SELECT u.id, 'dr. Budi Santoso', 'Dokter Umum', 'SIP/002/2026', '081234567891', TRUE
FROM users u WHERE u.username = 'dokter2'
  AND NOT EXISTS (SELECT 1 FROM dokter WHERE user_id = u.id AND deleted_at IS NULL);

-- ════════════════════════════════════════════════════════
-- PASIEN DUMMY — 10 pasien beragam (siswa & umum)
-- ════════════════════════════════════════════════════════
INSERT INTO pasien (no_rm, nama, tanggal_lahir, jenis_kelamin, alamat, no_telepon,
                    jenis_pasien, kelas, nis, nik,
                    nama_wali, telepon_wali, hubungan_wali,
                    alergi, kondisi_khusus, keterangan) VALUES
-- Siswa dengan riwayat medis penting
('RM-2026-00001', 'Ahmad Fauzi',      '2008-03-15', 'Laki-laki', 'Jl. Merdeka No. 1',    '081111111111',
  'siswa', 'X IPA 1', '2008001', NULL,
  'Mahmud Fauzi', '087700000001', 'Ayah',
  'Penisilin', 'Asma ringan', 'Bawa inhaler saat berolahraga'),

('RM-2026-00002', 'Dewi Sartika',     '2007-07-22', 'Perempuan', 'Jl. Pahlawan No. 5',   '082222222222',
  'siswa', 'XI IPA 2', '2007002', NULL,
  'Sari Wulandari', '087700000002', 'Ibu',
  NULL, NULL, NULL),

('RM-2026-00003', 'Rizki Pratama',    '2009-11-08', 'Laki-laki', 'Jl. Sudirman No. 10',  '083333333333',
  'siswa', 'IX A', '2009003', NULL,
  'Hendra Pratama', '087700000003', 'Ayah',
  'Seafood', NULL, NULL),

('RM-2026-00004', 'Siti Nurhaliza',   '2008-05-30', 'Perempuan', 'Jl. Gajah Mada No. 3', '084444444444',
  'siswa', 'X IPS 1', '2008004', NULL,
  'Nurjanah', '087700000004', 'Ibu',
  NULL, 'Diabetes tipe 1 — perlu monitoring gula darah', 'Bawa perlengkapan insulin'),

('RM-2026-00005', 'Bagas Setiawan',   '2006-09-14', 'Laki-laki', 'Jl. Ahmad Yani No. 7', '085555555555',
  'siswa', 'XII IPA 1', '2006005', NULL,
  'Setiawan', '087700000005', 'Ayah',
  NULL, NULL, NULL),

('RM-2026-00006', 'Citra Lestari',    '2010-02-18', 'Perempuan', 'Jl. Diponegoro No. 12','086666666666',
  'siswa', 'VIII B', '2010006', NULL,
  'Lestari Wati', '087700000006', 'Ibu',
  NULL, 'Epilepsi — obat rutin dari SpS', 'Jangan tinggalkan sendirian saat kejang'),

('RM-2026-00007', 'Fauzan Ramadhan',  '2011-06-25', 'Laki-laki', 'Jl. Veteran No. 3',    '087777777777',
  'siswa', 'VII C', '2011007', NULL,
  'Ramadhan Ali', '087700000007', 'Ayah',
  NULL, NULL, NULL),

-- Pasien umum
('RM-2026-00008', 'Hendra Kusuma',    '1985-04-10', 'Laki-laki', 'Jl. Flamboyan No. 8',  '088888888888',
  'umum', NULL, NULL, '3201234567890001',
  'Ratna Kusuma', '087700000008', 'Istri',
  'Sulfa', 'Hipertensi — rutin konsumsi amlodipine', NULL),

('RM-2026-00009', 'Rini Agustina',    '1992-08-17', 'Perempuan', 'Jl. Nusa Indah No. 2', '089999999999',
  'umum', NULL, NULL, '3201234567890002',
  NULL, NULL, NULL,
  NULL, NULL, NULL),

('RM-2026-00010', 'Doni Setiabudi',   '1978-12-05', 'Laki-laki', 'Jl. Kenanga No. 15',   '081000000010',
  'umum', NULL, NULL, '3201234567890003',
  'Sumiati', '087700000010', 'Istri',
  'Aspirin', 'Riwayat maag kronis', 'Hindari NSAID')
ON CONFLICT (no_rm) DO NOTHING;

-- ════════════════════════════════════════════════════════
-- OBAT — 15 jenis, beragam kategori, stok realistis
-- ════════════════════════════════════════════════════════
INSERT INTO obat (kode_obat, nama, jenis, satuan, stok, stok_minimum, harga, tanggal_kadaluarsa, keterangan) VALUES
  ('OBT-00001', 'Paracetamol 500mg',     'Analgesik/Antipiretik', 'Tablet',  300, 30,   500,  '2027-12-31', 'Demam & nyeri ringan'),
  ('OBT-00002', 'Ibuprofen 400mg',       'Analgesik/NSAID',       'Tablet',  150, 20,   800,  '2027-09-30', 'Nyeri & inflamasi — hindari untuk maag'),
  ('OBT-00003', 'Amoxicillin 500mg',     'Antibiotik',            'Kapsul',  120, 15,  1500,  '2027-06-30', 'Infeksi bakteri — habiskan'),
  ('OBT-00004', 'Cetirizine 10mg',       'Antihistamin',          'Tablet',  100, 15,   600,  '2027-11-30', 'Alergi & gatal'),
  ('OBT-00005', 'Antasida Doen',         'Antasida',              'Tablet',   80, 10,   300,  '2027-08-31', 'Maag & kembung'),
  ('OBT-00006', 'Oralit',                'Rehidrasi Oral',        'Sachet',   60, 10,  2000,  '2027-07-31', 'Diare & dehidrasi'),
  ('OBT-00007', 'Betadine Antiseptik',   'Antiseptik Topikal',    'Botol',    25,  5, 15000,  '2027-10-31', 'Luka & lecet'),
  ('OBT-00008', 'Salep Gentamicin',      'Antibiotik Topikal',    'Tube',     20,  5,  8000,  '2027-05-31', 'Infeksi kulit'),
  ('OBT-00009', 'Vitamin C 500mg',       'Vitamin',               'Tablet',  200, 20,   400,  '2027-06-30', 'Suplemen imunitas'),
  ('OBT-00010', 'Rivanol',               'Antiseptik',            'Botol',    15,  5,  5000,  '2027-04-30', 'Kompres luka'),
  ('OBT-00011', 'Domperidone 10mg',      'Antiemetik',            'Tablet',   80, 10,  1200,  '2027-10-31', 'Mual & muntah'),
  ('OBT-00012', 'Loratadine 10mg',       'Antihistamin',          'Tablet',   60, 10,   800,  '2027-08-31', 'Alergi non-sedatif'),
  ('OBT-00013', 'Salbutamol 2mg',        'Bronkodilator',         'Tablet',   40,  8,  1000,  '2027-07-31', 'Asma & bronkospasme'),
  ('OBT-00014', 'Dexamethasone 0.5mg',   'Kortikosteroid',        'Tablet',   50, 10,   700,  '2027-09-30', 'Inflamasi & alergi berat'),
  ('OBT-00015', 'Metformin 500mg',       'Antidiabetik',          'Tablet',   3,  10,  1100,  '2027-06-30', 'Diabetes tipe 2 — STOK RENDAH untuk uji alert')
ON CONFLICT (kode_obat) DO NOTHING;

-- ════════════════════════════════════════════════════════
-- TARIF LAYANAN — 5 tarif beragam
-- ════════════════════════════════════════════════════════
INSERT INTO tarif_layanan (kode_tarif, nama, jenis, harga, jenis_pasien, aktif, keterangan) VALUES
  ('TRF-00001', 'Konsultasi Dokter Umum',     'Konsultasi', 30000, NULL,    TRUE, 'Tarif standar konsultasi'),
  ('TRF-00002', 'Konsultasi Dokter Umum Siswa','Konsultasi', 15000, 'siswa', TRUE, 'Tarif subsidi untuk siswa sekolah'),
  ('TRF-00003', 'Perawatan Luka Ringan',       'Tindakan',  25000, NULL,    TRUE, 'Luka lecet, gores, jahit sederhana'),
  ('TRF-00004', 'Pemeriksaan Tekanan Darah',   'Pemeriksaan',10000, NULL,   TRUE, 'Termasuk konsultasi singkat'),
  ('TRF-00005', 'Surat Keterangan Sehat',      'Administrasi',20000, NULL,  TRUE, 'Untuk keperluan sekolah/kerja')
ON CONFLICT (kode_tarif) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '✅ Seed selesai: 6 user, 2 dokter, 10 pasien, 15 obat, 5 tarif.';
END $$;
