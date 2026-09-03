# Sistem Informasi Klinik — Yayasan Insan Mulia Berkah

Aplikasi web manajemen klinik berbasis peran (RBAC) untuk **Admin**, **Dokter**, dan **Apoteker**.
Dibangun dengan Node.js + React, dengan fokus pada keamanan produksi, performa tinggi, dan integritas data medis.

> *Melayani dengan hati, memberi dengan ikhlas.*

---

## Tech Stack

| Layer        | Teknologi                                                                   |
|--------------|-----------------------------------------------------------------------------|
| Backend      | Node.js ≥ 18, Express 4.19, PostgreSQL ≥ 14                                |
| Frontend     | React 18.3, Vite 5.3, TailwindCSS 3.4, TanStack Query 5.51                 |
| Auth         | JWT (sessionStorage, 8 jam), bcryptjs (cost 12)                            |
| Upload       | Multer 2.3 + Sharp 0.35 — resize ke 256×256 WebP                           |
| Security     | Helmet (HSTS, CSP, frameguard), express-rate-limit, CSRF header, CORS      |
| Compression  | `compression` middleware — Gzip level 6 untuk semua respons text            |
| Logging      | Pino + pino-pretty (structured, redact PII)                                 |
| PDF Export   | jsPDF 2.5 + jspdf-autotable 3.8 (lazy loaded)                              |
| Retry        | axios-retry — auto retry GET request saat network error transien            |

---

## Prasyarat

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 berjalan di `localhost:5432`
- **npm** ≥ 9

---

## Cara Menjalankan

### 1. Buat database PostgreSQL

```sql
CREATE DATABASE klinik_sekolah;
```

### 2. Konfigurasi backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` dan sesuaikan nilai berikut:

```env
DB_USER=postgres
DB_PASSWORD=password_anda
JWT_SECRET=random_string_minimal_32_karakter   # WAJIB diganti
FRONTEND_URL=http://localhost:5173
```

> **Generate JWT_SECRET yang kuat:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Server akan **berhenti otomatis** saat startup jika `JWT_SECRET` tidak di-set atau terlalu pendek.

### 3. Install dependensi

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 4. Migrasi & seed database

```bash
cd backend
npm run migrate   # buat semua tabel + indexes
npm run seed      # isi data awal (user default + contoh obat)
```

Atau sekaligus:

```bash
npm run setup
```

### 5. Jalankan aplikasi

**Terminal 1 — Backend API (port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```

Buka browser: **http://localhost:5173**

---

## Akun Default

| Username  | Password     | Role     |
|-----------|--------------|----------|
| admin     | Password123! | Admin    |
| dokter1   | Password123! | Dokter   |
| dokter2   | Password123! | Dokter   |
| apoteker1 | Password123! | Apoteker |

> Ganti password setelah login pertama via menu **Pengaturan akun**.

Login menggunakan **username** atau **email**.

---

## Fitur Lengkap

### Semua Role
- Login dengan username atau email
- Dashboard statistik real-time (cache 60 detik, refresh otomatis)
- **Notifikasi bell** di topbar sesuai role — polling 30 detik
- Upload & ganti foto profil (JPG/PNG/WebP, maks 2 MB, di-crop 256×256 WebP)
- Edit profil (nama, email) dan ubah password
- **Sidebar resizable** — seret tepi kanan untuk ubah lebar (min 150px / maks 400px), double-click untuk collapse ke icon-only
- Sesi otomatis berakhir saat browser/tab ditutup (`sessionStorage`)
- Halaman 403 informatif saat akses route yang tidak diizinkan

### Admin
- Dashboard: statistik pasien, kunjungan hari ini & bulan ini, resep menunggu, stok obat, grafik 7 hari
- **Data pasien**: CRUD, No. RM otomatis (`RM-YYYY-XXXXX`), riwayat kunjungan
- **Data dokter**: kelola profil & status aktif
- **Manajemen kunjungan**: daftarkan, batalkan, filter tanggal & status
- **Manajemen user**: buat admin/dokter/apoteker, reset password, nonaktifkan
- **Laporan**: filter periode + dokter + status, ringkasan statistik, **export PDF**

### Dokter
- **Antrian pasien**: daftar kunjungan hari ini per-status, refresh 30 detik
- **Input rekam medis**: vital sign (TD, suhu, BB, TB), keluhan, diagnosa, terapi
- **Tulis resep**: multi-obat dengan dosis & aturan pakai, cek stok real-time
- **Riwayat pasien**: cari pasien, riwayat rekam medis accordion
- **Data pasien**: akses read-only (tanpa edit/hapus)

### Apoteker
- **Antrian resep**: daftar resep masuk, detail item & stok
- **Konfirmasi penyerahan**: stok berkurang otomatis, kunjungan selesai otomatis
- **Data obat**: CRUD, kode obat otomatis (`OBT-XXXXX`), update stok (masuk/keluar/koreksi + log)
- Alert stok rendah & obat hampir kadaluarsa (≤ 30 hari)

---

## Keamanan

Sistem telah melalui **audit keamanan lengkap (24 item)** mencakup OWASP Top 10.

| Aspek | Implementasi |
|-------|-------------|
| Autentikasi | JWT + verifikasi ke DB setiap request |
| Otorisasi | RBAC `authorize(...roles)` per route |
| Brute-force | Rate limit: 10 percobaan login / 15 menit / IP |
| JWT revoke | `password_changed_at` — token lama invalid setelah ganti password |
| CSRF | Custom header `X-Requested-With: XMLHttpRequest` di semua mutasi |
| SQL injection | Parameterized query, zero interpolasi kolom/nilai dari user input |
| IDOR rekam medis | Dokter hanya akses pasien yang pernah ia tangani |
| Path traversal upload | `crypto.randomBytes` filename + boundary check `startsWith(UPLOAD_DIR)` |
| `/uploads` | Dilindungi `authenticate` middleware — tidak bisa diakses publik |
| Race condition stok | `SELECT ... FOR UPDATE` dalam transaksi PostgreSQL |
| Input validation | Middleware `validatePasien/User/Obat/Kunjungan` di semua route mutasi |
| Security headers | HSTS, CSP, frameguard, noSniff, hidePoweredBy, referrerPolicy, Permissions-Policy |
| Token storage | `sessionStorage` — bersih saat browser/tab ditutup |
| Password | bcrypt cost factor 12, dummy hash untuk anti timing-attack |
| Logging | Pino dengan `redact` — password/token tidak pernah masuk log |
| Upload foto | Multer (filter MIME + batas 2 MB) + Sharp (konversi sebelum simpan) |
| Transaksi DB | `withTransaction` helper — ROLLBACK aman, tidak double-fail |

---

## Performa

Sistem telah melalui **audit performa (22 item)** dan dioptimasi untuk Core Web Vitals.

| Aspek | Implementasi |
|-------|-------------|
| Bundle size | **~127 kB gzip** initial load (turun 67% via code splitting) |
| Code splitting | 11 halaman lazy + 7 vendor chunks terpisah |
| jsPDF | 727 kB — **lazy loaded**, hanya saat halaman Laporan dibuka |
| Gzip | Level 6, threshold 1 kB — response JSON berkurang ~70% |
| Dashboard cache | In-memory 60 detik — hemat ~90% query saat banyak user aktif |
| Query timeout | `withTimeout(8s)` per query di `getDashboard` |
| Pagination | `COUNT(*) OVER()` window function — satu query, tidak double round-trip |
| DB timeout | `statement_timeout=30s`, `idle_in_transaction=10s` |
| DB shutdown | Graceful shutdown `SIGTERM/SIGINT` — pool ditutup bersih |
| Font loading | `preconnect` + `preload` + `font-display=swap` |
| App loader | Inline spinner sebelum React mount — tidak ada layar putih (FOUC) |
| Touch targets | Minimum 44×44px — WCAG 2.5.5 |
| Retry | `axios-retry` — 2x retry untuk GET, delay 800ms/1600ms |
| DB indexes | 24 partial index (`WHERE deleted_at IS NULL`) pada kolom kritis |

---

## Struktur Proyek

```
Klinik/
├── .gitignore
├── README.md
├── backend/
│   ├── .env.example
│   ├── .gitignore
│   ├── uploads/
│   │   └── profil/              # Foto profil (exclude dari git)
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_tables.sql
│   │   │   └── run.js
│   │   └── seeds/
│   │       ├── 001_seed_data.sql
│   │       └── run.js
│   └── src/
│       ├── index.js             # Entry point: helmet, csrf, cors, gzip, routes
│       ├── config/
│       │   └── database.js      # pg Pool + timeouts + graceful shutdown
│       ├── controllers/         # Business logic: auth, pasien, dokter, user,
│       │                        # kunjungan, obat, resep, rekamMedis, laporan
│       ├── middleware/
│       │   ├── auth.js          # JWT authenticate + authorize + revoke check
│       │   ├── csrf.js          # X-Requested-With header validation
│       │   └── upload.js        # Multer foto profil
│       ├── routes/              # Express router per domain
│       └── utils/
│           ├── cache.js         # In-memory cache dengan TTL
│           ├── db.js            # withTransaction helper
│           ├── logger.js        # Pino + redact PII
│           ├── pagination.js    # parsePagination + paginateQuery (COUNT OVER)
│           ├── response.js      # Standard HTTP response helper
│           └── validate.js      # Input validation middleware
└── frontend/
    ├── .gitignore
    ├── vite.config.js           # manualChunks, esbuild minify, content hash
    ├── tailwind.config.js
    ├── index.html               # preconnect, preload font, inline loader
    └── src/
        ├── api/
        │   ├── axios.js         # Instance + CSRF header + retry + 401 handler
        │   └── index.js         # Semua API endpoint
        ├── components/
        │   ├── common/          # Spinner, Pagination, SearchInput, ErrorBoundary
        │   └── layout/          # Sidebar (resizable), Topbar, MainLayout
        ├── contexts/
        │   └── AuthContext.jsx  # sessionStorage, setUser sync
        ├── hooks/
        │   └── useNotifikasi.js # Bell notifikasi per role (polling 30s)
        ├── pages/
        │   ├── admin/           # Pasien, Dokter, Users, Kunjungan, Laporan
        │   ├── dokter/          # Antrian, RiwayatPasien
        │   ├── apoteker/        # AntrianResep, Obat
        │   ├── Dashboard.jsx    # Eager loaded
        │   ├── Login.jsx        # Eager loaded, split-screen layout
        │   ├── Profil.jsx       # Lazy loaded
        │   └── Pengaturan.jsx   # Lazy loaded
        └── utils/
            └── helpers.js       # formatDate, hitungUmur, statusLabel, dll
```

---

## API Endpoints Utama

| Method | Path                           | Akses               |
|--------|--------------------------------|---------------------|
| POST   | /api/auth/login                | Public              |
| GET    | /api/auth/me                   | Semua               |
| PUT    | /api/auth/profile              | Semua               |
| POST   | /api/auth/foto-profil          | Semua               |
| PUT    | /api/auth/change-password      | Semua               |
| GET    | /api/pasien                    | Semua               |
| POST   | /api/pasien                    | Admin               |
| PUT    | /api/pasien/:id                | Admin               |
| DELETE | /api/pasien/:id                | Admin               |
| GET    | /api/kunjungan/antrian         | Semua               |
| POST   | /api/kunjungan                 | Admin, Dokter       |
| PATCH  | /api/kunjungan/:id/status      | Admin, Dokter       |
| POST   | /api/rekam-medis               | Admin, Dokter       |
| GET    | /api/rekam-medis/pasien/:id    | Admin, Dokter       |
| POST   | /api/resep                     | Admin, Dokter       |
| GET    | /api/resep/antrian             | Apoteker, Admin     |
| PATCH  | /api/resep/:id/konfirmasi      | Apoteker            |
| GET    | /api/obat                      | Semua               |
| POST   | /api/obat                      | Admin, Apoteker     |
| PATCH  | /api/obat/:id/stok             | Admin, Apoteker     |
| GET    | /api/laporan/dashboard         | Semua               |
| GET    | /api/laporan/kunjungan         | Admin               |
| GET    | /api/laporan/obat              | Admin               |
| GET    | /api/users                     | Admin               |
| POST   | /api/users                     | Admin               |
| PUT    | /api/users/:id                 | Admin               |
| PUT    | /api/users/:id/reset-password  | Admin               |
| DELETE | /api/users/:id                 | Admin               |
| GET    | /uploads/profil/:filename      | Semua (autentikasi) |

---

## Catatan Penting

- **Soft delete** — data tidak pernah dihapus permanen, hanya di-flag `deleted_at`
- **No. RM** — format `RM-YYYY-XXXXX`, di-generate otomatis saat pendaftaran
- **Kode obat** — format `OBT-XXXXX`, di-generate otomatis saat tambah obat
- **Stok obat** — `SELECT FOR UPDATE` dalam transaksi mencegah race condition concurrent
- **Token JWT** — `sessionStorage`, otomatis hilang saat browser/tab ditutup
- **Foto profil** — di-resize 256×256 px, dikonversi ke WebP, disimpan dengan nama acak
- **Laporan** — rentang tanggal wajib diisi, maksimal 3 bulan (92 hari) per request
- **Health check** — `GET /api/health` — respons minimal `OK` di production
- **Audit script** — `node audit_final.js` dari folder `backend/` untuk verifikasi 48 check

---

## Riwayat Audit

| Batch | Item | Status |
|-------|------|--------|
| CRITICAL (C1–C4) | 4 | ✅ Selesai |
| HIGH (H1–H7) | 7 | ✅ Selesai |
| MEDIUM (M1–M8) | 8 | ✅ Selesai |
| LOW (L1–L5) | 5 | ✅ Selesai |
| Performance (P1–P17) | 17 | ✅ Selesai |
| **Total checks** | **48/48** | **✅ 0 FAIL** |

---

## Pengembang

**Yuwatsiqul Aqwam** — Yayasan Insan Mulia Berkah
#   K l i n i k  
 