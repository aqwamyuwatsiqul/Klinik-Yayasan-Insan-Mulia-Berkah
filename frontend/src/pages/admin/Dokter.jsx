import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { dokterAPI } from '../../api';
import { getErrorMessage } from '../../utils/helpers';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { Pencil, Trash2, X, Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';

function DokterModal({ open, onClose, initial }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nama         : initial?.nama         || '',
      spesialisasi : initial?.spesialisasi || '',
      no_sip       : initial?.no_sip       || '',
      telepon      : initial?.telepon      || '',
      aktif        : initial?.aktif        ?? true,
    },
  });

  // Reset saat data berubah
  useEffect(() => {
    reset({
      nama         : initial?.nama         || '',
      spesialisasi : initial?.spesialisasi || '',
      no_sip       : initial?.no_sip       || '',
      telepon      : initial?.telepon      || '',
      aktif        : initial?.aktif        ?? true,
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: (d) => dokterAPI.update(initial.id, d),
    onSuccess: () => {
      toast.success('Data dokter diperbarui');
      qc.invalidateQueries(['dokter']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Edit data dokter</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nama dokter *</label>
              <input
                className={`input ${errors.nama ? 'input-error' : ''}`}
                {...register('nama', { required: 'Nama wajib diisi' })}
              />
              {errors.nama && <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>}
            </div>
            <div>
              <label className="label">Spesialisasi</label>
              <input className="input" placeholder="cth: Dokter Umum" {...register('spesialisasi')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">No. SIP</label>
                <input className="input" {...register('no_sip')} />
              </div>
              <div>
                <label className="label">Telepon</label>
                <input className="input" type="tel" {...register('telepon')} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register('aktif')}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-sm text-text-primary">Dokter aktif</span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : 'Simpan data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dokter() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [editData, setEdit] = useState(null);
  const [delId, setDelId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dokter', search, page],
    queryFn: () => dokterAPI.getAll({ search, page, limit: 12 }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const delMut = useMutation({
    mutationFn: () => dokterAPI.remove(delId),
    onSuccess: () => {
      toast.success('Data dokter dihapus');
      qc.invalidateQueries(['dokter']);
      setDelId(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Data dokter</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {data?.pagination?.total ?? 0} dokter terdaftar
            </p>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-border">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Cari nama atau spesialisasi..."
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState title="Belum ada data dokter" description="Data tidak ditemukan. Coba kata kunci lain." />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {data.data.map((d) => (
                <div
                  key={d.id}
                  className="border border-border rounded-[12px] p-4 hover:border-primary/40 hover:bg-primary-tint/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-tint rounded-[10px] flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-text-primary">{d.nama}</p>
                        <p className="text-xs text-text-secondary">{d.spesialisasi || 'Dokter Umum'}</p>
                      </div>
                    </div>
                    <span className={`badge ${d.aktif ? 'badge-green' : 'badge-gray'}`}>
                      {d.aktif ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-text-secondary space-y-0.5">
                    {d.no_sip  && <p>SIP: {d.no_sip}</p>}
                    {d.telepon && <p>Telp: {d.telepon}</p>}
                    {d.username && <p>Akun: @{d.username}</p>}
                  </div>

                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => setEdit(d)}
                      className="btn-ghost btn-sm flex-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit data
                    </button>
                    <button
                      onClick={() => setDelId(d.id)}
                      className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <DokterModal open={!!editData} initial={editData} onClose={() => setEdit(null)} />
      <ConfirmDialog
        open={!!delId}
        title="Hapus data dokter?"
        message="Data dokter akan dihapus dari sistem."
        onConfirm={() => delMut.mutate()}
        onCancel={() => setDelId(null)}
        loading={delMut.isPending}
      />
    </div>
  );
}
