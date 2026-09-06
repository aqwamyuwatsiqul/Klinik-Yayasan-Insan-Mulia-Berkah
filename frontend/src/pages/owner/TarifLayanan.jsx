import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { tarifAPI } from '../../api';
import { formatCurrency, getErrorMessage } from '../../utils/helpers';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

function TarifModal({ open, onClose, initial }) {
  const qc     = useQueryClient();
  const isEdit = !!initial;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nama         : initial?.nama         || '',
      jenis        : initial?.jenis        || '',
      harga        : initial?.harga        ?? 0,
      jenis_pasien : initial?.jenis_pasien || '',
      aktif        : initial?.aktif        ?? true,
      keterangan   : initial?.keterangan   || '',
    },
  });

  useEffect(() => {
    reset({
      nama         : initial?.nama         || '',
      jenis        : initial?.jenis        || '',
      harga        : initial?.harga        ?? 0,
      jenis_pasien : initial?.jenis_pasien || '',
      aktif        : initial?.aktif        ?? true,
      keterangan   : initial?.keterangan   || '',
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? tarifAPI.update(initial.id, d) : tarifAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? 'Tarif diperbarui' : 'Tarif berhasil ditambahkan');
      qc.invalidateQueries(['tarif']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? 'Edit tarif' : 'Tambah tarif baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            {isEdit && (
              <div className="px-3 py-2 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                Kode: <span className="font-mono font-bold text-primary-dark">{initial.kode_tarif}</span>
              </div>
            )}
            <div>
              <label className="label">Nama layanan *</label>
              <input
                className={`input ${errors.nama ? 'input-error' : ''}`}
                placeholder="cth: Konsultasi Dokter Umum"
                {...register('nama', { required: 'Nama wajib diisi' })}
              />
              {errors.nama && <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Jenis layanan</label>
                <input className="input" placeholder="cth: Konsultasi, Tindakan" {...register('jenis')} />
              </div>
              <div>
                <label className="label">Harga (Rp) *</label>
                <input
                  type="number" min="0" className={`input ${errors.harga ? 'input-error' : ''}`}
                  {...register('harga', { required: 'Harga wajib diisi', min: { value: 0, message: 'Minimal 0' } })}
                />
                {errors.harga && <p className="text-xs text-status-danger mt-1">{errors.harga.message}</p>}
              </div>
            </div>
            <div>
              <label className="label">Berlaku untuk</label>
              <select className="input" {...register('jenis_pasien')}>
                <option value="">Semua pasien</option>
                <option value="siswa">Siswa saja</option>
                <option value="umum">Umum saja</option>
              </select>
            </div>
            <div>
              <label className="label">Keterangan</label>
              <textarea className="input" rows={2} {...register('keterangan')} />
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('aktif')} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-text-primary">Tarif aktif</span>
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : (isEdit ? 'Simpan' : 'Tambahkan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TarifLayanan() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page,   setPage  ] = useState(1);
  const [modal,  setModal ] = useState(null);
  const [delId,  setDelId ] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tarif', search, page],
    queryFn: () => tarifAPI.getAll({ search, page, limit: 15 }).then(r => r.data.data),
    keepPreviousData: true,
  });

  const delMut = useMutation({
    mutationFn: () => tarifAPI.remove(delId),
    onSuccess: () => { toast.success('Tarif dihapus'); qc.invalidateQueries(['tarif']); setDelId(null); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Tarif layanan</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {data?.pagination?.total ?? 0} tarif terdaftar
            </p>
          </div>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Tambah tarif
          </button>
        </div>
        <div className="px-6 py-3 border-b border-border">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Cari nama atau jenis tarif..." className="max-w-sm" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState title="Belum ada tarif layanan" description="Tambahkan tarif konsultasi, tindakan, dan layanan lainnya." />
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th><th>Nama Layanan</th><th>Jenis</th>
                    <th>Harga</th><th>Berlaku untuk</th><th>Status</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((t) => (
                    <tr key={t.id}>
                      <td className="font-mono text-xs text-primary">{t.kode_tarif}</td>
                      <td className="font-medium text-text-primary">{t.nama}</td>
                      <td className="text-text-secondary">{t.jenis || '—'}</td>
                      <td className="font-semibold text-text-primary">{formatCurrency(t.harga)}</td>
                      <td>
                        <span className={`badge ${!t.jenis_pasien ? 'badge-gray' : 'badge-blue'}`}>
                          {t.jenis_pasien ? (t.jenis_pasien === 'siswa' ? 'Siswa' : 'Umum') : 'Semua'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${t.aktif ? 'badge-green' : 'badge-gray'}`}>
                          {t.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal({ type: 'edit', data: t })}
                            className="p-1.5 rounded-[6px] hover:bg-status-warning-bg text-status-warning" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDelId(t.id)}
                            className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger" title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data.pagination} onPageChange={setPage} />
          </>
        )}
      </div>
      <TarifModal
        open={modal?.type === 'add' || modal?.type === 'edit'}
        initial={modal?.type === 'edit' ? modal.data : null}
        onClose={() => setModal(null)}
      />
      <ConfirmDialog
        open={!!delId}
        title="Hapus tarif?"
        message="Tarif ini akan dihapus dari sistem."
        onConfirm={() => delMut.mutate()}
        onCancel={() => setDelId(null)}
        loading={delMut.isPending}
      />
    </div>
  );
}
