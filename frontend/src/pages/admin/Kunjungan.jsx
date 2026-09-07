import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { kunjunganAPI, pasienAPI, dokterAPI } from '../../api';
import { formatDateTime, statusKunjunganLabel, getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Plus, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

function DaftarModal({ open, onClose }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { tanggal: dayjs().format('YYYY-MM-DD') },
  });
  const [q, setQ] = useState('');

  const { data: pasienData } = useQuery({
    queryKey: ['pasien-search-kj', q],
    queryFn: () => pasienAPI.getAll({ search: q, limit: 10 }).then((r) => r.data.data),
    enabled: q.length > 1,
  });

  // Reset pilihan pasien setiap kali hasil pencarian berubah — mencegah
  // kondisi di mana pasien_id lama masih tersimpan di form meski daftar
  // pasien yang tampil sudah berbeda karena kata kunci pencarian diganti
  useEffect(() => {
    setValue('pasien_id', '');
  }, [pasienData, setValue]);
  const { data: dokterData } = useQuery({
    queryKey: ['dokter-select'],
    queryFn: () => dokterAPI.getAll({ limit: 50 }).then((r) => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (d) => kunjunganAPI.create(d),
    onSuccess: () => {
      toast.success('Kunjungan berhasil didaftarkan');
      qc.invalidateQueries(['kunjungan-admin']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Daftarkan kunjungan</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Cari pasien *</label>
              <input
                className="input"
                placeholder="Ketik nama atau No. RM..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {pasienData?.data?.length > 0 && (
                <div className="mt-1 border border-border rounded-[8px] max-h-40 overflow-y-auto shadow-sm">
                  {pasienData.data.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-primary-tint cursor-pointer"
                    >
                      <input
                        type="radio"
                        value={p.id}
                        {...register('pasien_id', { required: 'Pilih pasien terlebih dahulu' })}
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-text-primary">{p.nama}</p>
                        <p className="text-xs text-text-secondary">{p.no_rm} | {p.kelas || '-'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {errors.pasien_id && (
                <p className="text-xs text-status-danger mt-1">{errors.pasien_id.message}</p>
              )}
            </div>
            <div>
              <label className="label">Dokter</label>
              <select className="input" {...register('dokter_id')}>
                <option value="">-- Pilih dokter --</option>
                {dokterData?.data?.filter((d) => d.aktif).map((d) => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Tanggal</label>
              <input type="date" className="input" {...register('tanggal')} />
            </div>
            <div>
              <label className="label">Keluhan</label>
              <textarea className="input" rows={2} placeholder="Keluhan utama pasien..." {...register('keluhan')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : 'Daftarkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const statusConfig = {
  '':             { label: 'Semua',          active: 'bg-primary text-white' },
  menunggu:       { label: 'Menunggu',       active: 'bg-primary text-white' },
  diperiksa:      { label: 'Diperiksa',      active: 'bg-primary text-white' },
  menunggu_bayar: { label: 'Menunggu Bayar', active: 'bg-primary text-white' },
  selesai:        { label: 'Selesai',        active: 'bg-primary text-white' },
  batal:          { label: 'Batal',          active: 'bg-primary text-white' },
};

export default function Kunjungan() {
  const qc = useQueryClient();
  const [tanggal, setTanggal]     = useState(dayjs().format('YYYY-MM-DD'));
  const [statusF, setStatusF]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [batalId,   setBatalId  ] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kunjungan-admin', tanggal, statusF],
    queryFn: () =>
      kunjunganAPI.getAntrian({ tanggal, status: statusF || undefined }).then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => kunjunganAPI.updateStatus(id, { status }),
    onSuccess: () => {
      toast.success('Status kunjungan diperbarui');
      qc.invalidateQueries(['kunjungan-admin']);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Manajemen kunjungan</h2>
            <p className="text-xs text-text-secondary">{data?.length ?? 0} kunjungan ditemukan</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refetch()} className="btn-secondary btn-sm" title="Perbarui data">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowModal(true)} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Daftarkan
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-border flex flex-wrap gap-3 items-center">
          <input
            type="date"
            className="input text-sm w-auto"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
          />
          <div className="flex gap-1 flex-wrap">
            {Object.entries(statusConfig).map(([s, cfg]) => (
              <button
                key={s}
                onClick={() => setStatusF(s)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                  statusF === s
                    ? 'bg-primary text-white'
                    : 'bg-surface-page text-text-secondary hover:bg-primary-tint hover:text-primary-dark'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.length ? (
          <EmptyState
            title="Tidak ada kunjungan"
            description="Belum ada kunjungan pada tanggal ini."
          />
        ) : (
          <div className="table-wrapper rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Pasien</th><th>Dokter</th>
                  <th>Keluhan</th><th>Waktu</th><th>Status</th><th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((k, i) => {
                  const { label, cls } = statusKunjunganLabel(k.status);
                  return (
                    <tr key={k.id}>
                      <td className="text-text-secondary">{i + 1}</td>
                      <td>
                        <p className="font-medium text-text-primary text-sm">{k.nama_pasien}</p>
                        <p className="text-xs text-text-secondary">{k.no_rm} | {k.kelas || '-'}</p>
                      </td>
                      <td className="text-text-secondary text-sm">{k.nama_dokter || '-'}</td>
                      <td className="text-text-secondary text-sm max-w-xs truncate">
                        {k.keluhan || '-'}
                      </td>
                      <td className="text-text-secondary text-xs whitespace-nowrap">
                        {formatDateTime(k.waktu_daftar)}
                      </td>
                      <td><span className={cls}>{label}</span></td>
                      <td>
                        {['menunggu', 'diperiksa', 'menunggu_bayar'].includes(k.status) && (
                          <button
                            onClick={() => setBatalId(k.id)}
                            className="btn-secondary btn-sm text-status-danger border-status-danger/30 hover:bg-status-danger-bg"
                          >
                            Batalkan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DaftarModal open={showModal} onClose={() => setShowModal(false)} />
      <ConfirmDialog
        open={!!batalId}
        title="Batalkan kunjungan?"
        message="Kunjungan akan dibatalkan dan tidak bisa dikembalikan. Pastikan pasien dan dokter sudah diberitahu."
        onConfirm={() => { statusMut.mutate({ id: batalId, status: 'batal' }); setBatalId(null); }}
        onCancel={() => setBatalId(null)}
        loading={statusMut.isPending}
      />
    </div>
  );
}
