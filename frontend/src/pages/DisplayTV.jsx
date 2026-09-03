/**
 * DisplayTV.jsx — Halaman Display TV Antrian
 *
 * Route publik (/tv), tidak butuh login.
 * Data di-poll tiap 15 detik dari GET /api/tv/antrian (endpoint tanpa auth).
 *
 * Layout:
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  HEADER: Logo + Nama Klinik + Jam realtime                       │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │  SUMMARY BAR: Menunggu | Diperiksa | Selesai                     │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │  TABEL ANTRIAN (scroll otomatis jika banyak)                     │
 *  │  No. | Nama Pasien | Kelas | Dokter | Waktu Daftar | Status      │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 * Dirancang untuk layar 1080p landscape (TV/monitor ruang tunggu).
 * Juga responsif di tablet dan layar kecil (meja resepsionis).
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import 'dayjs/locale/id';
import { Clock, Users, CheckCircle, Stethoscope, RefreshCw, Tv2, WifiOff } from 'lucide-react';

dayjs.locale('id');

const POLL_INTERVAL = 15_000; // 15 detik
const API_URL       = '/api/tv/antrian';

// ── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  menunggu:  { label: 'Menunggu',  bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-500'  },
  diperiksa: { label: 'Diperiksa', bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500'   },
  selesai:   { label: 'Selesai',   bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500'  },
};

// ── Jam realtime ──────────────────────────────────────────────────────────
function Clock2() {
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="text-right flex-shrink-0">
      <p className="text-4xl font-bold text-white tabular-nums leading-none">
        {now.format('HH:mm:ss')}
      </p>
      <p className="text-sm text-green-200 mt-1 capitalize">
        {now.format('dddd, DD MMMM YYYY')}
      </p>
    </div>
  );
}

// ── Badge status ─────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Kartu summary ─────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, colorClass, bgClass }) {
  return (
    <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl ${bgClass}`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass} bg-white/30`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className={`text-4xl font-bold tabular-nums ${colorClass}`}>{value}</p>
        <p className={`text-sm font-medium ${colorClass} opacity-80`}>{label}</p>
      </div>
    </div>
  );
}

// ── Baris animasi masuk ───────────────────────────────────────────────────
function AntrianRow({ item, index, isNew }) {
  const isDiperiksa = item.status === 'diperiksa';
  const isSelesai   = item.status === 'selesai';

  return (
    <tr
      className={`
        transition-all duration-500
        ${isNew         ? 'animate-fade-in'          : ''}
        ${isDiperiksa   ? 'bg-blue-50'               : ''}
        ${isSelesai     ? 'bg-green-50 opacity-70'   : ''}
        ${!isDiperiksa && !isSelesai ? 'hover:bg-amber-50/60' : ''}
        border-b border-gray-100 last:border-0
      `}
    >
      {/* Nomor antrian */}
      <td className="px-6 py-4 w-20">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0
          ${isDiperiksa ? 'bg-blue-500 text-white'
            : isSelesai ? 'bg-green-100 text-green-700'
            : 'bg-primary text-white'}
        `}>
          {item.nomor_antrian}
        </div>
      </td>

      {/* Nama pasien */}
      <td className="px-6 py-4">
        <p className={`text-xl font-bold leading-tight ${isDiperiksa ? 'text-blue-900' : 'text-gray-900'}`}>
          {item.nama_pasien}
        </p>
        {item.kelas && (
          <p className="text-sm text-gray-500 mt-0.5">Kelas {item.kelas}</p>
        )}
      </td>

      {/* Dokter */}
      <td className="px-6 py-4">
        <p className="text-base font-semibold text-gray-800 leading-tight">
          {item.nama_dokter ? `Dr. ${item.nama_dokter}` : '—'}
        </p>
        {item.spesialisasi && (
          <p className="text-sm text-gray-500 mt-0.5">{item.spesialisasi}</p>
        )}
      </td>

      {/* Waktu daftar */}
      <td className="px-6 py-4 whitespace-nowrap">
        <p className="text-base font-mono text-gray-700 tabular-nums">
          {dayjs(item.waktu_daftar).format('HH:mm')}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">WIB</p>
      </td>

      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge status={item.status} />
        {isDiperiksa && (
          <p className="text-xs text-blue-600 font-semibold mt-1 animate-pulse">
            ● Sedang diperiksa
          </p>
        )}
      </td>
    </tr>
  );
}

// ── Halaman utama ─────────────────────────────────────────────────────────
export default function DisplayTV() {
  const [data,       setData      ] = useState(null);
  const [error,      setError     ] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [newIds,     setNewIds    ] = useState(new Set());
  const prevIdsRef = useRef(new Set());
  const tableRef   = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error('API error');

      const antrian = json.data.antrian || [];

      // Deteksi baris baru untuk efek animasi fade-in
      const incoming = new Set(antrian.map((r) => r.id));
      const added    = new Set([...incoming].filter((id) => !prevIdsRef.current.has(id)));
      prevIdsRef.current = incoming;
      if (added.size) {
        setNewIds(added);
        setTimeout(() => setNewIds(new Set()), 1500);
      }

      setData(json.data);
      setLastUpdate(dayjs());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Poll pertama + interval
  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchData]);

  const antrian = data?.antrian || [];
  const summary = data?.summary || { menunggu: 0, diperiksa: 0, selesai: 0, total: 0 };

  // Bagi antrian: yang aktif (menunggu/diperiksa) tampil lebih menonjol
  const aktif   = antrian.filter((r) => r.status !== 'selesai');
  const selesai = antrian.filter((r) => r.status === 'selesai');
  const rows    = [...aktif, ...selesai]; // aktif dulu, selesai di bawah

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── HEADER ── */}
      <header className="bg-primary-dark px-8 py-5 flex items-center justify-between gap-6 shadow-lg flex-shrink-0">
        {/* Logo + nama */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <img
              src="/logo.webp"
              alt="Logo"
              width="48"
              height="48"
              className="w-12 h-12 object-contain rounded-xl"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-white text-2xl font-bold leading-tight truncate">
              Yayasan Insan Mulia Berkah
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <Tv2 className="w-3.5 h-3.5 text-green-300 flex-shrink-0" />
              <p className="text-green-300 text-sm font-medium">Display Antrian Klinik</p>
            </div>
          </div>
        </div>

        {/* Status koneksi + jam */}
        <div className="flex items-center gap-6">
          {/* Indikator update */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            {error ? (
              <div className="flex items-center gap-1.5 text-red-300">
                <WifiOff className="w-4 h-4" />
                <span className="text-xs font-medium">Koneksi terputus</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-green-300">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-medium">Live</span>
              </div>
            )}
            {lastUpdate && (
              <p className="text-green-200/60 text-xs">
                Diperbarui {lastUpdate.format('HH:mm:ss')}
              </p>
            )}
          </div>

          <Clock2 />
        </div>
      </header>

      {/* ── SUMMARY BAR ── */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard
            icon={Clock}
            label="Menunggu"
            value={summary.menunggu}
            colorClass="text-amber-700"
            bgClass="bg-amber-50 border border-amber-200"
          />
          <SummaryCard
            icon={Stethoscope}
            label="Sedang diperiksa"
            value={summary.diperiksa}
            colorClass="text-blue-700"
            bgClass="bg-blue-50 border border-blue-200"
          />
          <SummaryCard
            icon={CheckCircle}
            label="Selesai"
            value={summary.selesai}
            colorClass="text-green-700"
            bgClass="bg-green-50 border border-green-200"
          />
        </div>
      </div>

      {/* ── TABEL ANTRIAN ── */}
      <main className="flex-1 overflow-auto px-8 py-6" ref={tableRef}>
        {/* State: loading */}
        {!data && !error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <RefreshCw className="w-10 h-10 text-primary animate-spin" />
            <p className="text-gray-500 text-lg">Memuat data antrian...</p>
          </div>
        )}

        {/* State: error */}
        {error && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <WifiOff className="w-12 h-12 text-red-400" />
            <p className="text-red-500 text-xl font-semibold">Tidak dapat terhubung ke server</p>
            <p className="text-gray-400 text-sm">Mencoba kembali setiap 15 detik...</p>
          </div>
        )}

        {/* State: tidak ada kunjungan */}
        {data && !error && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-20 h-20 rounded-2xl bg-primary-tint flex items-center justify-center">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <p className="text-gray-600 text-2xl font-bold">Belum ada antrian hari ini</p>
            <p className="text-gray-400">Data akan diperbarui otomatis</p>
          </div>
        )}

        {/* Tabel */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-primary-dark text-white">
                  <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide w-20">No.</th>
                  <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide">Nama Pasien</th>
                  <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide">Dokter</th>
                  <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide w-28">Waktu</th>
                  <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide w-40">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item, index) => (
                  <AntrianRow
                    key={item.id}
                    item={item}
                    index={index}
                    isNew={newIds.has(item.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-gray-200 px-8 py-3 flex items-center justify-between flex-shrink-0">
        <p className="text-xs text-gray-400">
          Harap menunggu hingga nomor antrian Anda dipanggil oleh petugas.
        </p>
        <p className="text-xs text-gray-400 tabular-nums">
          Total hari ini: <span className="font-semibold text-gray-600">{summary.total} pasien</span>
          {' · '}Diperbarui otomatis setiap 15 detik
        </p>
      </footer>
    </div>
  );
}
