import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditAPI } from '../../api';
import { formatDateTime } from '../../utils/helpers';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import { X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';

// ── Config tampilan per jenis aksi ────────────────────────────────────────
const AKSI_CONFIG = {
  LIHAT_REKAM_MEDIS     : { label: 'Lihat rekam medis',   cls: 'badge-blue'   },
  UBAH_IDENTITAS_PASIEN : { label: 'Ubah identitas pasien', cls: 'badge-yellow' },
  VOID_PEMBAYARAN       : { label: 'Void pembayaran',     cls: 'badge-red'    },
};

// ── Row expandable untuk detail perubahan ────────────────────────────────
function AuditRow({ log }) {
  const [open, setOpen] = useState(false);
  const cfg = AKSI_CONFIG[log.aksi] || { label: log.aksi, cls: 'badge-gray' };
  const hasDetail = log.perubahan && Object.keys(log.perubahan).length > 0;

  return (
    <>
      <tr
        className={`${hasDetail ? 'cursor-pointer hover:bg-primary-tint/40' : ''}`}
        onClick={() => hasDetail && setOpen(v => !v)}
      >
        <td className="text-text-secondary text-xs whitespace-nowrap">
          {formatDateTime(log.created_at)}
        </td>
        <td>
          <p className="font-medium text-text-primary text-sm">{log.user_nama}</p>
          <p className="text-xs text-text-secondary capitalize">{log.user_role}</p>
        </td>
        <td>
          <span className={`badge ${cfg.cls}`}>{cfg.label}</span>
        </td>
        <td className="text-text-secondary text-sm max-w-xs">
          <p className="truncate">{log.deskripsi || '—'}</p>
        </td>
        <td className="text-text-secondary text-xs">
          {log.ip_address || '—'}
        </td>
        <td className="w-8">
          {hasDetail && (
            open
              ? <ChevronUp className="w-4 h-4 text-text-secondary" />
              : <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </td>
      </tr>

      {/* Detail perubahan — baris expandable */}
      {hasDetail && open && (
        <tr className="bg-primary-tint/20">
          <td colSpan={6} className="px-6 py-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Detail perubahan
            </p>
            <div className="space-y-1.5">
              {Object.entries(log.perubahan).map(([field, nilai]) => {
                // nilai bisa berupa [lama, baru] atau string (alasan void)
                const isArray = Array.isArray(nilai);
                return (
                  <div key={field} className="flex items-start gap-3 text-sm">
                    <span className="font-medium text-text-primary min-w-[120px] flex-shrink-0 capitalize">
                      {field.replace(/_/g, ' ')}
                    </span>
                    {isArray ? (
                      <span className="text-text-secondary">
                        <span className="line-through opacity-60">{nilai[0] ?? '(kosong)'}</span>
                        {' → '}
                        <span className="font-semibold text-primary-dark">{nilai[1] ?? '(kosong)'}</span>
                      </span>
                    ) : (
                      <span className="text-text-secondary">{String(nilai)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Halaman utama ─────────────────────────────────────────────────────────
export default function AuditLog() {
  const today = dayjs().format('YYYY-MM-DD');
  const [filter, setFilter] = useState({
    tanggal_awal : today,
    tanggal_akhir: today,
    aksi         : '',
    user_id      : '',
    search       : '',
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', filter, page],
    queryFn: () => auditAPI.getAll({ ...filter, page, limit: 20 }).then(r => r.data.data),
    keepPreviousData: true,
  });

  // Daftar user untuk dropdown
  const { data: userList } = useQuery({
    queryKey: ['audit-users'],
    queryFn: () => auditAPI.getUsers().then(r => r.data.data),
  });

  const setF = (key, val) => { setFilter(f => ({ ...f, [key]: val })); setPage(1); };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[10px] bg-primary-tint flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-primary-dark">Audit Log</h2>
          <p className="text-sm text-text-secondary">
            Riwayat aktivitas sensitif — akses rekam medis, perubahan identitas, void transaksi
          </p>
        </div>
      </div>

      <div className="card">
        {/* Filter */}
        <div className="card-header flex-wrap gap-3">
          <p className="text-sm font-semibold text-text-primary">
            {data?.pagination?.total ?? 0} entri ditemukan
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <SearchInput
              value={filter.search}
              onChange={v => setF('search', v)}
              placeholder="Cari nama user atau deskripsi..."
              className="w-52"
            />
            {/* Tanggal */}
            <input type="date" className="input max-w-[140px] py-1.5 text-sm"
              value={filter.tanggal_awal}
              onChange={e => setF('tanggal_awal', e.target.value)}
            />
            <span className="text-text-secondary text-sm">—</span>
            <input type="date" className="input max-w-[140px] py-1.5 text-sm"
              value={filter.tanggal_akhir}
              onChange={e => setF('tanggal_akhir', e.target.value)}
            />
            {/* Jenis aksi */}
            <select className="input max-w-[180px] py-1.5 text-sm"
              value={filter.aksi}
              onChange={e => setF('aksi', e.target.value)}
            >
              <option value="">Semua aktivitas</option>
              {Object.entries(AKSI_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
            {/* Filter user */}
            <select className="input max-w-[160px] py-1.5 text-sm"
              value={filter.user_id}
              onChange={e => setF('user_id', e.target.value)}
            >
              <option value="">Semua user</option>
              {userList?.map(u => (
                <option key={u.user_id} value={u.user_id}>
                  {u.user_nama} ({u.user_role})
                </option>
              ))}
            </select>
            {/* Reset */}
            {(filter.aksi || filter.user_id || filter.search) && (
              <button
                onClick={() => setFilter({ tanggal_awal: today, tanggal_akhir: today, aksi: '', user_id: '', search: '' })}
                className="btn-secondary btn-sm"
                title="Reset filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState
            title="Tidak ada entri audit"
            description="Belum ada aktivitas sensitif yang tercatat pada periode dan filter yang dipilih."
          />
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>User</th>
                    <th>Aktivitas</th>
                    <th>Deskripsi</th>
                    <th>IP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map(log => <AuditRow key={log.id} log={log} />)}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
