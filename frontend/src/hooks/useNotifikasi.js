import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { kunjunganAPI, resepAPI } from '../api';
import dayjs from 'dayjs';

/**
 * Hook notifikasi per-role.
 * - Dokter   : antrian pasien 'menunggu' hari ini
 * - Apoteker : resep dengan status 'menunggu'
 * - Admin    : kunjungan 'menunggu' hari ini
 * Poll setiap 30 detik secara otomatis.
 */
export function useNotifikasi() {
  const { user } = useAuth();
  const role = user?.role;

  // ── Dokter & Admin: antrian kunjungan menunggu hari ini ──
  const { data: antrianData } = useQuery({
    queryKey: ['notif-antrian', role],
    queryFn: () =>
      kunjunganAPI
        .getAntrian({ tanggal: dayjs().format('YYYY-MM-DD'), status: 'menunggu' })
        .then((r) => r.data.data),
    enabled: role === 'dokter' || role === 'admin',
    refetchInterval: 30_000,
    staleTime: 0,
  });

  // ── Apoteker: resep menunggu diserahkan ──
  const { data: resepData } = useQuery({
    queryKey: ['notif-resep', role],
    queryFn: () =>
      resepAPI
        .getAntrian({ status: 'menunggu', limit: 20 })
        .then((r) => r.data.data),
    enabled: role === 'apoteker',
    refetchInterval: 30_000,
    staleTime: 0,
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

  return { items: [], count: 0 };
}
