import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resepAPI } from '../../api';
import { formatDateTime, statusResepLabel, getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { X, FlaskConical, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

function DetailModal({ open, onClose, resepId, onKonfirmasi }) {
  const { data, isLoading } = useQuery({
    queryKey: ['resep-detail', resepId],
    queryFn: () => resepAPI.getById(resepId).then((r) => r.data.data),
    enabled: open && !!resepId,
  });

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Detail resep</h2>
            {data && (
              <p className="text-xs text-text-secondary mt-0.5">
                {data.nama_pasien} — {data.no_rm}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <>
            <div className="modal-body space-y-5">
              {/* Info pasien & dokter */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Pasien',  data?.nama_pasien],
                  ['No. RM',  <span className="font-mono text-primary font-semibold">{data?.no_rm}</span>],
                  ['Kelas',   data?.kelas || '-'],
                  ['Dokter',  data?.nama_dokter],
                  ['Waktu',   formatDateTime(data?.tanggal)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-text-secondary mb-0.5">{k}</p>
                    <p className="font-medium text-text-primary">{v}</p>
                  </div>
                ))}
              </div>

              {/* Daftar obat */}
              <div>
                <p className="text-sm font-semibold text-text-primary mb-2">Daftar obat</p>
                <div className="space-y-2">
                  {data?.items?.map((item, i) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-[8px] border ${
                        item.obat_dihapus
                          ? 'border-status-danger/60 bg-status-danger-bg'
                          : item.stok < item.jumlah
                            ? 'border-status-danger/40 bg-status-danger-bg'
                            : 'border-border bg-primary-tint/40'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">
                          {item.nama_obat || '(obat telah dihapus)'}
                          {item.obat_dihapus && (
                            <span className="ml-2 badge badge-red text-[10px]">Dihapus</span>
                          )}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {item.dosis} · {item.aturan_pakai} · Jumlah:{' '}
                          <strong>{item.jumlah} {item.satuan}</strong>
                        </p>
                        {item.obat_dihapus ? (
                          <p className="text-xs text-status-danger mt-0.5 font-semibold">
                            Obat ini sudah dihapus — resep tidak bisa dikonfirmasi
                          </p>
                        ) : (
                        <p className="text-xs mt-0.5">
                          Stok:{' '}
                          <span className={
                            item.stok < item.jumlah
                              ? 'text-status-danger font-semibold'
                              : 'text-status-success font-semibold'
                          }>
                            {item.stok}
                          </span>
                          {item.stok < item.jumlah && (
                            <span className="ml-1 badge badge-red">Stok tidak cukup</span>
                          )}
                        </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data?.catatan && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">Catatan dokter</p>
                  <p className="text-sm bg-primary-tint rounded-[8px] px-3 py-2 text-text-primary">
                    {data.catatan}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={onClose} className="btn-secondary">Tutup</button>
              {data?.status === 'menunggu' && (
                <button
                  onClick={() => onKonfirmasi(resepId)}
                  className="btn-primary"
                >
                  <CheckCircle className="w-4 h-4" /> Serahkan obat
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AntrianResep() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('menunggu');
  const [selectedId,   setSelectedId  ] = useState(null);
  const [confirmId,    setConfirmId   ] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resep-antrian', statusFilter],
    queryFn: () =>
      resepAPI.getAntrian({ status: statusFilter, limit: 50 }).then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const konfMut = useMutation({
    mutationFn: (id) => resepAPI.konfirmasi(id),
    onSuccess: () => {
      toast.success('Obat berhasil diserahkan ke pasien');
      qc.invalidateQueries(['resep-antrian']);
      qc.invalidateQueries(['obat']);
      setConfirmId(null);
      setSelectedId(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const list = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Antrian resep</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {data?.pagination?.total ?? 0} resep ditemukan
            </p>
          </div>
          <div className="flex items-center gap-2">
            {statusFilter === 'menunggu' && list.length > 0 && (
              <span className="badge badge-yellow">{list.length} menunggu</span>
            )}
            <button
              onClick={() => refetch()}
              className="btn-secondary btn-sm"
              title="Perbarui antrian"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter status */}
        <div className="px-6 py-3 border-b border-border flex gap-2">
          {['menunggu', 'diproses', 'selesai', 'batal'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-white'
                  : 'bg-surface-page text-text-secondary hover:bg-primary-tint hover:text-primary-dark'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !list.length ? (
          <EmptyState
            title="Tidak ada resep"
            description={`Tidak ada resep dengan status "${statusFilter}".`}
          />
        ) : (
          <div className="divide-y divide-border">
            {list.map((r) => {
              const { label, cls } = statusResepLabel(r.status);
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-primary-tint/30 cursor-pointer transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                    r.status === 'menunggu' ? 'bg-status-warning-bg' : 'bg-surface-page border border-border'
                  }`}>
                    <FlaskConical className={`w-5 h-5 ${
                      r.status === 'menunggu' ? 'text-status-warning' : 'text-text-secondary'
                    }`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary">{r.nama_pasien}</p>
                    <p className="text-xs text-text-secondary">
                      {r.no_rm} | {r.kelas || '-'} | Dr. {r.nama_dokter} | {r.jumlah_item} item obat
                    </p>
                  </div>

                  {/* Status + waktu */}
                  <div className="text-right flex-shrink-0">
                    <span className={`${cls} block mb-1`}>{label}</span>
                    <p className="text-xs text-text-secondary">{formatDateTime(r.tanggal)}</p>
                  </div>

                  {/* Tombol serahkan */}
                  {r.status === 'menunggu' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); }}
                      className="btn-primary btn-sm flex-shrink-0"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Serahkan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DetailModal
        open={!!selectedId}
        resepId={selectedId}
        onClose={() => setSelectedId(null)}
        onKonfirmasi={(id) => { setSelectedId(null); setConfirmId(id); }}
      />
      <ConfirmDialog
        open={!!confirmId}
        variant="success"
        title="Serahkan obat ke pasien?"
        message="Stok obat akan berkurang otomatis sesuai resep. Pastikan semua obat tersedia."
        onConfirm={() => konfMut.mutate(confirmId)}
        onCancel={() => setConfirmId(null)}
        loading={konfMut.isPending}
      />
    </div>
  );
}
