import dayjs from 'dayjs';
import 'dayjs/locale/id';
dayjs.locale('id');

// ── Format tanggal ─────────────────────────────────────────────────────────
export const formatDate = (d, fmt = 'DD MMMM YYYY') => {
  if (!d) return '-';
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format(fmt) : '-';
};

export const formatDateTime = (d) => {
  if (!d) return '-';
  const parsed = dayjs(d);
  return parsed.isValid() ? parsed.format('DD MMM YYYY, HH:mm') : '-';
};

// ── L2 FIX: hitungUmur yang robust ────────────────────────────────────────
// Sebelumnya: string kosong '' → dayjs('') = hari ini → "0 tahun"
// Sebelumnya: angka negatif atau > 150 tidak divalidasi
export const hitungUmur = (d) => {
  // Tolak nilai falsy (null, undefined, 0, false) dan string kosong / spasi saja
  if (!d || (typeof d === 'string' && !d.trim())) return '-';

  const parsed = dayjs(d);

  // Tolak tanggal yang tidak bisa di-parse dayjs
  if (!parsed.isValid()) return '-';

  // Tolak tanggal di masa depan (belum lahir)
  if (parsed.isAfter(dayjs())) return '-';

  const years = dayjs().diff(parsed, 'year');

  // Sanity check: umur tidak mungkin > 150 tahun atau negatif
  if (years < 0 || years > 150) return '-';

  // Tampilkan bulan jika bayi < 1 tahun
  if (years === 0) {
    const months = dayjs().diff(parsed, 'month');
    if (months === 0) return '< 1 bulan';
    return `${months} bulan`;
  }

  return `${years} tahun`;
};

// ── Format mata uang ───────────────────────────────────────────────────────
export const formatCurrency = (v) =>
  new Intl.NumberFormat('id-ID', {
    style                : 'currency',
    currency             : 'IDR',
    minimumFractionDigits: 0,
  }).format(Number(v) || 0);

// ── Status label ───────────────────────────────────────────────────────────
export const statusKunjunganLabel = (s) =>
  ({
    menunggu      : { label: 'Menunggu',       cls: 'badge badge-yellow' },
    diperiksa     : { label: 'Diperiksa',      cls: 'badge badge-blue'   },
    menunggu_bayar: { label: 'Menunggu Bayar', cls: 'badge badge-red'    },
    selesai       : { label: 'Selesai',        cls: 'badge badge-green'  },
    batal         : { label: 'Batal',          cls: 'badge badge-gray'   },
  }[s] || { label: s || '-', cls: 'badge badge-gray' });

export const statusResepLabel = (s) =>
  ({
    menunggu : { label: 'Menunggu', cls: 'badge badge-yellow' },
    diproses : { label: 'Diproses', cls: 'badge badge-blue'   },
    selesai  : { label: 'Selesai',  cls: 'badge badge-green'  },
    batal    : { label: 'Batal',    cls: 'badge badge-red'    },
  }[s] || { label: s || '-', cls: 'badge badge-gray' });

export const statusPembayaranLabel = (s) =>
  ({
    lunas : { label: 'Lunas', cls: 'badge badge-green'  },
    void  : { label: 'Void',  cls: 'badge badge-red'    },
  }[s] || { label: s || '-', cls: 'badge badge-gray' });

// ── Role label ─────────────────────────────────────────────────────────────
export const roleLabel = (r) =>
  ({ admin: 'Admin', dokter: 'Dokter', apoteker: 'Apoteker', owner: 'Owner', kasir: 'Kasir' }[r] || r || '-');

// ── Error message extractor ────────────────────────────────────────────────
export const getErrorMessage = (e) =>
  e?.response?.data?.message || e?.message || 'Terjadi kesalahan';
