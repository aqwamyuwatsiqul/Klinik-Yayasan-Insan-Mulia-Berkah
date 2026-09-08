<div align="center">

# 🏥 Sistem Informasi Klinik
## Yayasan Insan Mulia Berkah

Aplikasi web manajemen klinik berbasis peran (RBAC) yang melayani siswa sekolah (UKS) dan masyarakat umum — dari pendaftaran pasien, pemeriksaan dokter, penyiapan obat, hingga pembayaran kasir dalam satu sistem terintegrasi.

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%3E%3D14-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production--Ready-22c55e?style=flat-square)
![QA](https://img.shields.io/badge/QA-38%2F38%20Passed-22c55e?style=flat-square)
![License](https://img.shields.io/badge/License-Private-red?style=flat-square)

> *Melayani dengan hati, memberi dengan ikhlas.*

</div>

---

## 📋 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Tech Stack](#-tech-stack)
- [Prasyarat](#-prasyarat)
- [Quick Start](#-quick-start)
- [Akun Pengujian Default](#-akun-pengujian-default)
- [Struktur Direktori](#-struktur-direktori)
- [API Endpoints](#-api-endpoints)
- [Keamanan](#-keamanan)
- [Lisensi & Kontak](#-lisensi--kontak)

---

## ✨ Fitur Utama

Sistem mendukung **5 role** dengan alur kerja yang terpadu:

| Role | Fitur Utama |
|------|-------------|
| 👑 **Owner** | Manajemen user & dokter, laporan keuangan penuh, audit log, dashboard statistik |
| 🖥️ **Admin** | Pendaftaran pasien (siswa/umum), manajemen kunjungan, laporan + export PDF, Display TV |
| 🩺 **Dokter** | Antrian pasien real-time, input rekam medis & vital sign, tulis resep multi-obat |
| 💊 **Apoteker** | Antrian resep, konfirmasi penyiapan obat, manajemen stok, alert stok rendah & kadaluarsa |
| 💰 **Kasir** | Kalkulasi tagihan otomatis (tindakan + obat), proses pembayaran, cetak nota |
| 📺 **Display TV** | Layar antrian publik fullscreen tanpa login, polling 15 detik, akses `/tv` |

**Fitur lintas role:**
- Dashboard statistik real-time dengan cache 60 detik
- Notifikasi bell per role (polling 30 detik)
- Upload foto profil — di-resize 256×256 WebP, diproteksi JWT
- Sidebar resizable dengan mode icon-only
- Sesi otomatis berakhir saat browser ditutup

---

## 🛠️ Tech Stack

### Backend
| Komponen | Teknologi |
|----------|-----------|
| Runtime & Framework | Node.js ≥ 18, Express 4.22 |
| Database | PostgreSQL ≥ 14 (SQL migrations, 27 partial indexes) |
| Autentikasi | JWT (8 jam) + bcryptjs cost 12 |
| Keamanan | Helmet, express-rate-limit, CSRF custom header, CORS |
| Upload & Gambar | Multer 2.3 + Sharp 0.35 (WebP 256×256) |
| Logging | Pino + pino-pretty (redact PII) |
| Transaksi DB | `withTransaction` helper (BEGIN/COMMIT/ROLLBACK) |
| Kompresi | Gzip level 6, threshold 1 kB |

### Frontend
| Komponen | Teknologi |
|----------|-----------|
| UI Framework | React 18.3 + Vite 5.4 |
| Styling | TailwindCSS 3.4 |
| State & Fetching | TanStack Query 5.51 + axios-retry |
| Routing | React Router v7 |
| PDF Export | jsPDF 2.5 + jspdf-autotable (lazy loaded) |
| Bundle | ~127 kB gzip, code splitting 11 halaman + 7 vendor chunks |

---

## ⚙️ Prasyarat

Pastikan perangkat Anda telah menginstal:

- **Node.js** versi 18 atau lebih baru
- **PostgreSQL** versi 14 atau lebih baru, berjalan di `localhost:5432`
- **npm** versi 9 atau lebih baru

---

## 🚀 Quick Start

### 1. Clone repositori

```bash
git clone https://github.com/username/klinik-yayasan-insan-mulia.git
cd klinik-yayasan-insan-mulia
```

### 2. Buat database PostgreSQL

```sql
CREATE DATABASE klinik_sekolah;
```

### 3. Konfigurasi environment

```bash
cd backend
cp .env.example .env
```

Buka `.env` dan sesuaikan nilai berikut:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=klinik_sekolah
DB_USER=postgres
DB_PASSWORD=password_anda

JWT_SECRET=isi_dengan_string_acak_minimal_32_karakter   # WAJIB diganti
FRONTEND_URL=http://localhost:5173
PORT=5000
```

> 💡 **Generate `JWT_SECRET` yang kuat:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
> Server akan **berhenti otomatis** saat startup jika `JWT_SECRET` tidak di-set atau terlalu pendek.

### 4. Install dependensi

```bash
# Dari root — install backend dan frontend sekaligus
npm run install:all
```

Atau secara terpisah:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 5. Migrasi & seed database

```bash
cd backend

npm run migrate   # Jalankan semua SQL migration secara berurutan
npm run seed      # Isi data awal: akun default, obat, tarif, pasien dummy
```

Atau sekaligus:

```bash
npm run setup
```

> 🔄 **Reset total untuk pengujian ulang dari awal:**
> ```bash
> node database/seeds/run.js --reset
> ```
> Perintah ini akan TRUNCATE seluruh tabel, reset semua sequence, lalu seed ulang dari awal.

### 6. Jalankan aplikasi

Buka **dua terminal** secara bersamaan:

```bash
# Terminal 1 — Backend API (port 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Buka browser: **http://localhost:5173**

### 7. Build production

```bash
cd frontend && npm run build   # Output ke frontend/dist/
cd backend && node src/index.js
```

---

## 🔑 Akun Pengujian Default

Tersedia setelah menjalankan `npm run seed`:

| Role | Email | Password | Nama |
|------|-------|----------|------|
| 👑 Owner | owner@klinik.com | `Owner123!` | Owner Klinik |
| 🖥️ Admin | admin@klinik.com | `Admin123!` | Admin Klinik |
| 🩺 Dokter | dokter@klinik.com | `Dokter123!` | dr. Siti Rahayu |
| 🩺 Dokter 2 | dokter2@klinik.com | `Dokter123!` | dr. Budi Santoso |
| 💊 Apoteker | apoteker@klinik.com | `Apoteker123!` | Apoteker Klinik |
| 💰 Kasir | kasir@klinik.com | `Kasir123!` | Kasir Klinik |

> ⚠️ Ganti seluruh password default sebelum deployment ke server produksi via menu **Pengaturan Akun**.

**Data seed tambahan yang disertakan:**
- 10 pasien dummy (7 siswa dengan kelas & NIS, 3 pasien umum dengan NIK)
- 15 obat dalam berbagai kategori (1 obat sengaja di-set stok rendah untuk menguji alert)
- 5 tarif tindakan klinik

---

## 📁 Struktur Direktori

```
Klinik/
├── package.json                    # Script root: install:all, setup, dev
│
├── backend/
│   ├── .env.example                # Template environment variables
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_tables.sql       # Skema awal seluruh tabel
│   │   │   ├── 002_role_owner_kasir.sql    # Penambahan role Owner & Kasir
│   │   │   ├── 003_pasien_extended.sql     # Ekstensi data pasien (8 kolom baru)
│   │   │   └── run.js
│   │   └── seeds/
│   │       ├── 000_reset.sql               # TRUNCATE + RESTART IDENTITY
│   │       ├── 001_seed_data.sql           # Data awal lengkap
│   │       └── run.js                      # Mendukung flag --reset
│   └── src/
│       ├── index.js                # Entry point (helmet, cors, gzip, routes)
│       ├── config/
│       │   └── database.js         # pg Pool + timeout + graceful shutdown
│       ├── controllers/            # Logic handler per domain
│       │   ├── authController.js
│       │   ├── kunjunganController.js
│       │   ├── laporanController.js
│       │   ├── pasienController.js
│       │   ├── obatController.js
│       │   ├── pembayaranController.js
│       │   ├── rekamMedisController.js
│       │   ├── resepController.js
│       │   ├── dokterController.js
│       │   └── userController.js
│       ├── middleware/
│       │   ├── auth.js             # JWT authenticate + authorize + revoke check
│       │   ├── csrf.js             # Validasi X-Requested-With header
│       │   └── upload.js           # Multer foto profil
│       ├── routes/                 # Express router per domain
│       └── utils/
│           ├── cache.js            # In-memory cache dengan TTL
│           ├── db.js               # withTransaction (BEGIN/COMMIT/ROLLBACK)
│           ├── logger.js           # Pino + redact PII
│           ├── pagination.js       # paginateQuery dengan COUNT(*) OVER()
│           ├── response.js         # Standard HTTP response helper
│           └── validate.js         # Input validation middleware
│
└── frontend/
    ├── vite.config.js              # Code splitting, proxy /api & /uploads
    ├── tailwind.config.js
    ├── index.html                  # Preload font+logo, inline app loader
    ├── public/
    │   ├── logo.webp               # Logo teroptimasi (19 KB dari 228 KB)
    │   ├── logo-fallback.png
    │   └── favicon-64.png
    └── src/
        ├── api/
        │   ├── axios.js            # Instance + CSRF + retry + 401 handler
        │   └── index.js            # Seluruh definisi endpoint API
        ├── components/
        │   ├── common/             # Spinner, Pagination, SearchInput, ConfirmDialog, ErrorBoundary
        │   └── layout/             # Sidebar (resizable), Topbar, MainLayout
        ├── contexts/
        │   └── AuthContext.jsx     # State autentikasi global (sessionStorage)
        ├── hooks/
        │   ├── useNotifikasi.js    # Bell notifikasi per role
        │   └── useAuthedImage.js   # Fetch gambar terproteksi → blob URL
        ├── pages/
        │   ├── admin/              # Pasien, Kunjungan, Dokter, Users, Laporan
        │   ├── dokter/             # Antrian, RiwayatPasien
        │   ├── apoteker/           # AntrianResep, Obat
        │   ├── kasir/              # AntrianKasir, ProsesBayar, RiwayatTransaksi
        │   ├── Dashboard.jsx
        │   ├── DisplayTV.jsx       # Layar antrian publik (/tv)
        │   ├── Login.jsx
        │   ├── Profil.jsx
        │   └── Pengaturan.jsx
        └── utils/
            └── helpers.js          # formatDate, hitungUmur, statusLabel, roleLabel
```

---

## 🔌 API Endpoints

### Publik (tanpa autentikasi)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| `POST` | `/api/auth/login` | Login dengan email/username + password |
| `GET` | `/api/tv/antrian` | Data antrian untuk Display TV (rate-limited 30 req/menit) |
| `GET` | `/api/health` | Health check — mengembalikan `OK` |

### Terautentikasi — Bearer JWT

<details>
<summary><strong>Auth & Profil</strong></summary>

| Method | Endpoint | Akses |
|--------|----------|-------|
| `GET` | `/api/auth/me` | Semua role |
| `PUT` | `/api/auth/profile` | Semua role |
| `POST` | `/api/auth/foto-profil` | Semua role |
| `PUT` | `/api/auth/change-password` | Semua role |
| `GET` | `/uploads/profil/:filename` | Semua role (JWT wajib) |

</details>

<details>
<summary><strong>Pasien & Kunjungan</strong></summary>

| Method | Endpoint | Akses |
|--------|----------|-------|
| `GET` | `/api/pasien` | Admin, Dokter, Owner |
| `POST` | `/api/pasien` | Admin |
| `PUT` | `/api/pasien/:id` | Admin |
| `DELETE` | `/api/pasien/:id` | Admin |
| `GET` | `/api/kunjungan/antrian` | Semua role |
| `POST` | `/api/kunjungan` | Admin, Dokter |
| `PATCH` | `/api/kunjungan/:id/status` | Admin, Dokter |

</details>

<details>
<summary><strong>Rekam Medis & Resep</strong></summary>

| Method | Endpoint | Akses |
|--------|----------|-------|
| `GET` | `/api/rekam-medis/kunjungan/:id` | Dokter, Admin, Owner |
| `GET` | `/api/rekam-medis/pasien/:id` | Dokter, Admin, Owner |
| `POST` | `/api/rekam-medis` | **Dokter saja** |
| `PUT` | `/api/rekam-medis/:id` | **Dokter saja** |
| `POST` | `/api/resep` | Dokter |
| `GET` | `/api/resep/antrian` | Apoteker, Admin |
| `PATCH` | `/api/resep/:id/konfirmasi` | Apoteker |

</details>

<details>
<summary><strong>Obat, Pembayaran & Laporan</strong></summary>

| Method | Endpoint | Akses |
|--------|----------|-------|
| `GET` | `/api/obat` | Semua role |
| `POST` | `/api/obat` | Admin, Apoteker |
| `PATCH` | `/api/obat/:id/stok` | Admin, Apoteker |
| `GET` | `/api/pembayaran/tagihan/:kunjunganId` | Kasir |
| `POST` | `/api/pembayaran` | Kasir |
| `GET` | `/api/pembayaran/riwayat` | Kasir, Owner, Admin |
| `GET` | `/api/laporan/dashboard` | Semua role |
| `GET` | `/api/laporan/kunjungan` | Admin, Owner |
| `GET` | `/api/laporan/obat` | Admin, Apoteker, Owner |

</details>

<details>
<summary><strong>Manajemen User & Dokter (Owner)</strong></summary>

| Method | Endpoint | Akses |
|--------|----------|-------|
| `GET` | `/api/users` | Owner |
| `POST` | `/api/users` | Owner |
| `PUT` | `/api/users/:id` | Owner |
| `PUT` | `/api/users/:id/reset-password` | Owner |
| `DELETE` | `/api/users/:id` | Owner |
| `PUT` | `/api/dokter/:id` | Owner |
| `DELETE` | `/api/dokter/:id` | Owner |

</details>

---

## 🔒 Keamanan

Sistem telah melalui **audit keamanan 48 item** mencakup OWASP Top 10.

| Area | Implementasi |
|------|-------------|
| Autentikasi | JWT + verifikasi ke DB setiap request |
| Otorisasi | RBAC `authorize(...roles)` per route |
| Brute-force | Rate limit 10x login / 15 menit / IP |
| JWT revoke | `password_changed_at` — token lama invalid setelah ganti password |
| CSRF | Custom header `X-Requested-With` di semua mutasi |
| SQL Injection | Parameterized query — zero interpolasi input dari user |
| IDOR | Dokter hanya bisa akses rekam medis pasien yang pernah ditangani sendiri |
| Race condition | `SELECT FOR UPDATE` dalam transaksi PostgreSQL untuk stok obat |
| Upload | Multer (filter MIME + max 2 MB) + Sharp (konversi sebelum simpan) |
| Path traversal | Nama file acak (`crypto.randomBytes`) + boundary check path |
| Security headers | HSTS, CSP, frameguard, noSniff, referrerPolicy, Permissions-Policy |
| Logging | Pino dengan `redact` — password & token tidak masuk log |
| Transaksi DB | `withTransaction` — ROLLBACK otomatis, data tidak setengah tersimpan |

---

## 📊 Status QA

Sistem telah melalui pengujian regresi akhir dan simulasi E2E skenario database bersih.

```
Sanity Check : 38/38 PASSED ✅
Failed       : 0
Simulasi E2E : LULUS semua alur (fresh DB + transaksi pertama)
Build        : ✅ 0 errors, ~127 kB gzip
```

**Bug yang telah diperbaiki (v2 — siklus QA akhir):**

| ID | Modul | Deskripsi | Severity |
|----|-------|-----------|----------|
| C1–C6 | Pasien, Kunjungan, Resep, Kasir, Laporan | 6 bug critical alur utama | Critical ✅ |
| H1–H3 | Obat, Pasien, Auth | Orphan data, FK constraint, token stale | High ✅ |
| M1–M2, N6–N7 | UI, Pagination, Dashboard | Modal stuck, spinner infinite, null crash | Medium ✅ |

---

## 📝 Catatan Deployment

Sebelum menjalankan di server produksi:

1. **Ganti semua password default** akun seed melalui menu Pengaturan Akun
2. **Set `JWT_SECRET`** dengan string acak minimal 48 karakter — jangan gunakan nilai default
3. **Jalankan migration** sebelum seed: `npm run migrate && npm run seed`
4. **Konfigurasi `FRONTEND_URL`** di `.env` backend sesuai domain produksi
5. **Pastikan direktori `uploads/profil/`** writable oleh proses Node.js
6. Untuk regenerasi aset logo: `cd frontend && node scripts/optimize-images.js`

---

## 📄 Lisensi & Kontak

Proyek ini merupakan sistem informasi internal milik **Yayasan Insan Mulia Berkah**.
Seluruh hak cipta dilindungi. Dilarang mendistribusikan atau memodifikasi tanpa izin tertulis.

**Dikembangkan oleh:**

**Yuwatsiqul Aqwam**
Yayasan Insan Mulia Berkah

---

<div align="center">
<sub>Sistem Informasi Klinik v2.0.0 · Production-Ready · © 2026 Yayasan Insan Mulia Berkah</sub>
</div>
