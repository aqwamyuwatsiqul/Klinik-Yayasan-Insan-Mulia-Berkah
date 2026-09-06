import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { kunjunganAPI, resepAPI } from '../api';
import dayjs from 'dayjs';

/**
 * Hook notifikasi per-role.
 * - Dokter   : antrian pasien 'menunggu' hari ini
 * - Apoteker : resep dengan status 'menunggu'
 * - Admin    : kunjungan 'menunggu' hari ini
 * - Owner/Kasir : tidak ada notifikasi operasional
 * Poll setiap 30 detik secara otomatis.
 */
export function useNotifikasi() {
  const { user, loading } = useAuth();
  const role = user?.role;

  // ── Dokter & Admin: antrian kunjungan menunggu hari ini ──
  const { data: antrianData } = useQuery({
    queryKey: ['notif-antrian', role],
    queryFn: () =>
      kunjunganAPI
        .getAntrian({ tanggal: dayjs().format('YYYY-MM-DD'), status: 'menunggu' })
        .then((r) => r.data.data),
    // Tunggu sampai auth selesai verifikasi token (loading=false)
    // dan hanya aktif untuk role yang relevan
    enabled: !loading && (role === 'dokter' || role === 'admin'),
    refetchInterval: 30_000,
    staleTime: 0,
    meta: { silent: true },
  });

  // ── Apoteker: resep menunggu diserahkan ──
  const { data: resepData } = useQuery({
    queryKey: ['notif-resep', role],
    queryFn: () =>
      resepAPI
        .getAntrian({ status: 'menunggu', limit: 20 })
        .then((r) => r.data.data),
    enabled: !loading && role === 'apoteker',
    refetchInterval: 30_000,
    staleTime: 0,
    meta: { silent: true },
  });

  if (role === 'dokter' || role === 'admin') {
    const items = (antrianData || []).map((k) => ({
      id   : k.id,
      type : 'kunjungan',
      title: `${k.nama_pasien}`,
      desc : k.keluhan ? `Keluhan: ${k.keluhan}` : 'Menunggu diperiksa',
      time : k.waktu_daftar,
      to   : role === 'dokter' ? '/antrian' : '/kunjungan',
    }));
    return { items, count: items.length };
  }

  if (role === 'apoteker') {
    const items = (resepData?.data || []).map((r) => ({
      id   : r.id,
      type : 'resep',
      title: `${r.nama_pasien}`,
      desc : `${r.jumlah_item} item obat — Dr. ${r.nama_dokter}`,
      time : r.tanggal,
      to   : '/antrian-resep',
    }));
    return { items, count: items.length };
  }

  // owner, kasir, dan role lain: tidak ada notifikasi operasional
  return { items: [], count: 0 };
}
