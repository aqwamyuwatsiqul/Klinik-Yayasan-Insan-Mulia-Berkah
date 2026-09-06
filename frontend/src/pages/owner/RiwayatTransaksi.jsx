import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { pembayaranAPI } from '../../api';
import { formatCurrency, formatDateTime, statusPembayaranLabel, getErrorMessage } from '../../utils/helpers';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { X, Eye, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ── Modal detail pembayaran ───────────────────────────────────────────────
function DetailModal({ open, onClose, pembayaranId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pembayaran-detail', pembayaranId],
    queryFn: () => pembayaranAPI.getById(pembayaranId).then(r => r.data.data),
    enabled: open && !!pembayaranId,
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Detail transaksi</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">
          {isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
            <div className="space-y-4">
              {data?.status === 'void' && (
                <div className="px-3 py-2.5 bg-status-danger-bg border border-red-200 rounded-[8px]">
                  <p className="text-sm font-semibold text-red-800">Transaksi di-void</p>
                  <p className="text-xs text-red-700 mt-0.5">Oleh: {data.nama_void_oleh} • {formatDateTime(data.waktu_void)}</p>
                  <p className="text-xs text-red-700">Alasan: {data.alasan_void}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Pasien',    data?.nama_pasien],
                  ['No. RM',    <span className="font-mono text-primary">{data?.no_rm}</span>],
                  ['Dokter',    data?.nama_dokter || '—'],
                  ['Kasir',     data?.nama_kasir  || '—'],
                  ['Metode',    data?.metode_bayar?.toUpperCase()],
                  ['Waktu bayar', formatDateTime(data?.waktu_bayar)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-text-secondary">{k}</p>
                    <p className="font-medium text-text-primary">{v}</p>
                  </div>
                ))}
              </div>
              {/* Rincian item */}
              {data?.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Rincian</p>
                  <div className="space-y-1">
                    {data.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-text-primary">{item.nama} ×{item.jumlah}</span>
                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="font-bold">Total</span>
                <span className="text-xl font-bold text-primary-dark">{formatCurrency(data?.total_tagihan)}</span>
              </div>
              {data?.kembalian > 0 && (
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Diterima</span>
                  <span>{formatCurrency(data?.total_bayar)}</span>
                </div>
              )}
              {data?.kembalian > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Kembalian</span>
                  <span className="font-semibold text-primary-dark">{formatCurrency(data?.kembalian)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Tutup</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal void ─────────────────────────────────────────────────────────────
function VoidModal({ open, onClose, pembayaranId }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => pembayaranAPI.void(pembayaranId, { alasan_void: d.alasan }),
    onSuccess: () => {
      toast.success('Transaksi berhasil di-void');
      qc.invalidateQueries(['riwayat-transaksi']);
      reset();
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Void transaksi</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))}>
          <div className="modal-body space-y-3">
            <div className="px-3 py-2.5 bg-status-warning-bg border border-yellow-200 rounded-[8px] text-sm text-amber-800">
              Transaksi yang di-void tidak dapat dikembalikan ke status lunas. Kunjungan akan kembali ke antrian kasir.
            </div>
            <div>
              <label className="label">Alasan void * <span className="text-text-secondary font-normal">(min. 10 karakter)</span></label>
              <textarea
                className={`input ${errors.alasan ? 'input-error' : ''}`}
                rows={3}
                placeholder="Jelaskan alasan pembatalan transaksi ini..."
                {...register('alasan', {
                  required: 'Alasan wajib diisi',
                  minLength: { value: 10, message: 'Minimal 10 karakter' },
                })}
              />
              {errors.alasan && <p className="text-xs text-status-danger mt-1">{errors.alasan.message}</p>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-danger">
              {mutation.isPending ? <Spinner size="sm" /> : <><ShieldOff className="w-4 h-4" /> Void transaksi</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Halaman utama ─────────────────────────────────────────────────────────
export default function RiwayatTransaksi() {
  const today = dayjs().format('YYYY-MM-DD');
  const [filter, setFilter] = useState({
    tanggal_awal : today,
    tanggal_akhir: today,
    status       : '',
    metode_bayar : '',
  });
  const [page,      setPage     ] = useState(1);
  const [modal,     setModal    ] = useState(null); // { type: 'detail'|'void', id }

  const { data, isLoading } = useQuery({
    queryKey: ['riwayat-transaksi', filter, page],
    queryFn: () => pembayaranAPI.getRiwayat({ ...filter, page, limit: 15 }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const summary = data?.summary || {};

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total transaksi', value: summary.total_transaksi ?? 0, sub: 'lunas' },
          { label: 'Total pendapatan', value: formatCurrency(summary.total_pendapatan ?? 0), sub: 'periode terpilih' },
          { label: 'Transaksi void',  value: summary.total_void ?? 0, sub: 'dibatalkan' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="card p-4">
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-sm font-medium text-text-secondary mt-0.5">{label}</p>
            <p className="text-xs text-text-secondary">{sub}</p>
          </div>
        ))}
      </div>

      <div className="card">
        {/* Filter */}
        <div className="card-header flex-wrap gap-3">
          <h2 className="font-semibold text-text-primary">Riwayat transaksi</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" className="input max-w-[140px] py-1.5 text-sm"
              value={filter.tanggal_awal}
              onChange={e => { setFilter(f => ({ ...f, tanggal_awal: e.target.value })); setPage(1); }}
            />
            <span className="text-text-secondary text-sm">—</span>
            <input type="date" className="input max-w-[140px] py-1.5 text-sm"
              value={filter.tanggal_akhir}
              onChange={e => { setFilter(f => ({ ...f, tanggal_akhir: e.target.value })); setPage(1); }}
            />
            <select className="input max-w-[110px] py-1.5 text-sm"
              value={filter.status}
              onChange={e => { setFilter(f => ({ ...f, status: e.target.value })); setPage(1); }}
            >
              <option value="">Semua status</option>
              <option value="lunas">Lunas</option>
              <option value="void">Void</option>
            </select>
            <select className="input max-w-[110px] py-1.5 text-sm"
              value={filter.metode_bayar}
              onChange={e => { setFilter(f => ({ ...f, metode_bayar: e.target.value })); setPage(1); }}
            >
              <option value="">Semua metode</option>
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer</option>
              <option value="bpjs">BPJS</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState title="Tidak ada transaksi" description="Tidak ada transaksi pada periode dan filter yang dipilih." />
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pasien</th><th>Dokter</th><th>Metode</th>
                    <th>Total</th><th>Kasir</th><th>Waktu</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((t) => {
                    const { label, cls } = statusPembayaranLabel(t.status);
                    return (
                      <tr key={t.id} className={t.status === 'void' ? 'opacity-60' : ''}>
                        <td>
                          <p className="font-medium text-text-primary">{t.nama_pasien}</p>
                          <p className="text-xs text-text-secondary font-mono">{t.no_rm}</p>
                        </td>
                        <td className="text-text-secondary text-sm">{t.nama_dokter || '—'}</td>
                        <td>
                          <span className="badge badge-gray uppercase text-[10px]">
                            {t.metode_bayar || '—'}
                          </span>
                        </td>
                        <td className="font-semibold text-text-primary">{formatCurrency(t.total_tagihan)}</td>
                        <td className="text-text-secondary text-sm">{t.nama_kasir || '—'}</td>
                        <td className="text-text-secondary text-xs">{formatDateTime(t.waktu_bayar || t.waktu_void)}</td>
                        <td><span className={cls}>{label}</span></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'detail', id: t.id })}
                              className="p-1.5 rounded-[6px] hover:bg-status-info-bg text-status-info"
                              title="Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {t.status === 'lunas' && (
                              <button
                                onClick={() => setModal({ type: 'void', id: t.id })}
                                className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger"
                                title="Void transaksi"
                              >
                                <ShieldOff className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <DetailModal
        open={modal?.type === 'detail'}
        pembayaranId={modal?.id}
        onClose={() => setModal(null)}
      />
      <VoidModal
        open={modal?.type === 'void'}
        pembayaranId={modal?.id}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
