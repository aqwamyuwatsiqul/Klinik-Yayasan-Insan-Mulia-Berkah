# GitHub Actions — Panduan Setup

## db-backup.yml — Backup Database Harian

Workflow ini menjalankan `pg_dump` setiap hari pukul **02.00 WIB** dan menyimpan
hasilnya sebagai GitHub Artifact dengan retensi **90 hari**.

### Secrets yang Harus Dikonfigurasi

Buka **Settings → Secrets and variables → Actions → New repository secret**,
lalu tambahkan secret berikut (sesuaikan dengan nilai Neon/database Anda):

| Secret | Contoh Nilai | Keterangan |
|--------|-------------|------------|
| `DB_HOST` | `ep-xxx.ap-southeast-1.aws.neon.tech` | Host database (dari Neon dashboard) |
| `DB_PORT` | `5432` | Port PostgreSQL (default 5432) |
| `DB_NAME` | `klinik_sekolah` | Nama database |
| `DB_USER` | `klinik_owner` | Username database |
| `DB_PASSWORD` | `...` | Password database |

> ⚠️ Gunakan **read-only database user** khusus untuk backup jika memungkinkan —
> prinsip least privilege. Buat di Neon: **Settings → Roles → New Role**.

### Cara Trigger Manual

1. Buka tab **Actions** di GitHub
2. Pilih workflow **Database Backup Harian**
3. Klik **Run workflow** → isi alasan (opsional) → **Run workflow**

### Cara Restore dari Backup

1. Buka tab **Actions** → pilih run yang diinginkan → **Artifacts** → download file `.sql.gz`
2. Jalankan:

```bash
# Ekstrak
gunzip backup-2026-09-01.sql.gz

# Restore ke database (hati-hati: --clean akan DROP tabel yang ada dulu)
psql \
  --host=HOST \
  --port=5432 \
  --username=USER \
  --dbname=DB_NAME \
  < backup-2026-09-01.sql
```

### Catatan

- Backup disimpan **90 hari** — GitHub menghapus artifact lama secara otomatis
- File backup di-compress dengan `gzip -9` — ukuran biasanya 80–90% lebih kecil dari plain SQL
- Notifikasi gagal muncul di **Job Summary** dan email notifikasi GitHub Actions standar
- Untuk backup lebih dari 90 hari, pertimbangkan upload ke Cloudinary, S3, atau Google Drive
  dengan menambahkan step upload tambahan di workflow
