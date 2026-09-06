import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { laporanAPI } from '../api';
import Spinner from '../components/common/Spinner';
import {
  Users, Calendar, FlaskConical, Package,
  AlertTriangle, CheckCircle, Clock, ClipboardList, Tv2,
} from 'lucide-react';
import { formatDateTime, statusKunjunganLabel } from '../utils/helpers';

function StatCard({ icon: Icon, label, value, tint = false, sub }) {
  return (
    <div className={`card p-5 flex items-center gap-4 ${tint ? 'bg-primary-tint border-primary/20' : ''}`}>
      <div className={`stat-icon ${tint ? 'bg-primary/20' : 'bg-primary-tint'}`}>
        <Icon className="w-6 h-6 text-primary-dark" />
      </div>
      <div>
        <p className="text-2xl font-bold text-text-primary">{value ?? '—'}</p>
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function BarChart({ data }) {
  if (!data?.length)
    return (
      <p className="text-sm text-text-secondary text-center py-8">
        Belum ada data kunjungan
      </p>
    );

  const max = Math.max(...data.map((d) => parseInt(d.total)), 1);

  // Format label hari lengkap
  const formatHari = (tanggal) => {
    const d = new Date(tanggal);
    const hari = d.toLocaleDateString('id-ID', { weekday: 'long' });   // Senin, Selasa, ...
    const tgl  = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }); // 01 Jan
    return { hari, tgl };
  };

  // Cek apakah hari ini
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday  = (tanggal) => tanggal?.toString().slice(0, 10) === todayStr;

  return (
    <div>
      {/* Bar */}
      <div className="flex items-end gap-2 h-32 px-1 mb-3">
        {data.map((d, i) => {
          const today   = isToday(d.tanggal);
          const pct     = (parseInt(d.total) / max) * 88; // px
          const { hari, tgl } = formatHari(d.tanggal);
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              title={`${hari}, ${tgl}: ${d.total} kunjungan`}
            >
              {/* Angka di atas bar */}
              <span className={`text-xs font-bold ${today ? 'text-primary' : 'text-primary-dark'}`}>
                {d.total}
              </span>

              {/* Bar */}
              <div
                className={`w-full rounded-t transition-all ${
                  today ? 'bg-primary' : 'bg-primary/50 group-hover:bg-primary/80'
                }`}
                style={{ height: `${pct}px`, minHeight: '4px' }}
              />

              {/* Tooltip saat hover */}
              <div className="
                absolute -top-10 left-1/2 -translate-x-1/2
                bg-text-primary text-white text-[10px] font-medium
                px-2 py-1 rounded-[6px] whitespace-nowrap
                opacity-0 group-hover:opacity-100 pointer-events-none
                transition-opacity z-10
              ">
                {d.total} kunjungan
              </div>
            </div>
          );
        })}
      </div>

      {/* Label bawah: nama hari + tanggal — TIDAK disingkat */}
      <div className="flex gap-2 px-1">
        {data.map((d, i) => {
          const today = isToday(d.tanggal);
          const { hari, tgl } = formatHari(d.tanggal);
          return (
            <div
              key={i}
              className={`flex-1 flex flex-col items-center gap-0.5 ${
                today ? 'text-primary font-semibold' : 'text-text-secondary'
              }`}
            >
              <span className="text-[11px] leading-tight text-center">{hari}</span>
              <span className="text-[10px] leading-tight">{tgl}</span>
              {today && (
                <span className="text-[9px] font-bold text-primary bg-primary-tint
                                 px-1 rounded leading-tight">
                  Hari ini
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => laporanAPI.getDashboard().then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = data?.statistik || {};

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary-dark">
            Selamat datang, {user?.nama}
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            Ringkasan aktivitas klinik hari ini.
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total pasien"
          value={s.total_pasien}
          tint
        />
        <StatCard
          icon={Calendar}
          label="Kunjungan hari ini"
          value={s.kunjungan_hari_ini}
          sub={`Total bulan ini: ${s.kunjungan_bulan_ini ?? 0} kunjungan`}
        />
        <StatCard
          icon={FlaskConical}
          label="Resep menunggu"
          value={s.resep_menunggu}
          tint
        />
        <StatCard
          icon={Package}
          label="Jenis obat"
          value={s.total_obat}
        />
      </div>

      {/* Alert banners */}
      {(s.stok_rendah > 0 || s.hampir_kadaluarsa > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {s.stok_rendah > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-status-warning-bg border border-yellow-200">
              <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Stok obat rendah</p>
                <p className="text-xs text-amber-600">{s.stok_rendah} jenis obat perlu restok</p>
              </div>
            </div>
          )}
          {s.hampir_kadaluarsa > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-[12px] bg-status-danger-bg border border-red-200">
              <AlertTriangle className="w-5 h-5 text-status-danger flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Obat hampir kadaluarsa</p>
                <p className="text-xs text-red-600">{s.hampir_kadaluarsa} jenis dalam 30 hari ke depan</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="font-semibold text-text-primary">Kunjungan 7 hari terakhir</h3>
          </div>
          <div className="card-body">
            <BarChart data={data?.kunjungan_7_hari} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-text-primary">Status hari ini</h3>
          </div>
          <div className="card-body space-y-3">
            {[
              { status: 'menunggu',       icon: Clock,         bg: 'bg-status-warning-bg',  color: 'text-status-warning'  },
              { status: 'diperiksa',      icon: ClipboardList, bg: 'bg-status-info-bg',     color: 'text-status-info'     },
              { status: 'menunggu_bayar', icon: FlaskConical,  bg: 'bg-status-danger-bg',   color: 'text-status-danger'   },
              { status: 'selesai',        icon: CheckCircle,   bg: 'bg-status-success-bg',  color: 'text-status-success'  },
            ].map(({ status, icon: Icon, bg, color }) => {
              const row = data?.kunjungan_per_status?.find((r) => r.status === status);
              const label = {
                menunggu      : 'Menunggu',
                diperiksa     : 'Diperiksa',
                menunggu_bayar: 'Menunggu bayar',
                selesai       : 'Selesai',
              }[status];
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="flex-1 text-sm font-medium text-text-primary">{label}</p>
                  <span className="text-lg font-bold text-text-primary">{row?.total ?? 0}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabel kunjungan terbaru */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-text-primary">Kunjungan terbaru hari ini</h3>
          <button
            onClick={() => window.open('/tv', '_blank', 'noopener,noreferrer')}
            className="btn-primary btn-sm flex items-center gap-1.5"
            title="Buka halaman display TV antrian di tab baru"
          >
            <Tv2 className="w-3.5 h-3.5" />
            Tampilkan Display TV
          </button>
        </div>
        {!data?.kunjungan_terbaru?.length ? (
          <div className="card-body text-center text-sm text-text-secondary py-10">
            Belum ada kunjungan hari ini.
          </div>
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. RM</th>
                  <th>Nama</th>
                  <th>Kelas</th>
                  <th>Dokter</th>
                  <th>Waktu</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.kunjungan_terbaru.map((k) => {
                  const { label, cls } = statusKunjunganLabel(k.status);
                  return (
                    <tr key={k.id}>
                      <td className="font-mono text-xs text-primary">{k.no_rm}</td>
                      <td className="font-medium">{k.nama_pasien}</td>
                      <td className="text-text-secondary">{k.kelas || '-'}</td>
                      <td className="text-text-secondary">{k.nama_dokter || '-'}</td>
                      <td className="text-text-secondary text-xs whitespace-nowrap">
                        {formatDateTime(k.waktu_daftar)}
                      </td>
                      <td><span className={cls}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
