import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { pasienAPI } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate, hitungUmur, getErrorMessage } from '../../utils/helpers';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { Plus, Pencil, Trash2, Eye, X } from 'lucide-react';
import toast from 'react-hot-toast';
function PasienModal({ open, onClose, initial }) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  // Format tanggal ISO → YYYY-MM-DD untuk input type="date"
  const toDateInput = (v) => v ? v.toString().slice(0, 10) : '';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nama          : initial?.nama           || '',
      tanggal_lahir : toDateInput(initial?.tanggal_lahir),
      jenis_kelamin : initial?.jenis_kelamin  || '',
      kelas         : initial?.kelas          || '',
      no_telepon    : initial?.no_telepon     || '',
      alamat        : initial?.alamat         || '',
    },
  });

  // Reset form setiap kali initial berubah (pindah dari satu data ke data lain)
  useEffect(() => {
    reset({
      nama          : initial?.nama           || '',
      tanggal_lahir : toDateInput(initial?.tanggal_lahir),
      jenis_kelamin : initial?.jenis_kelamin  || '',
      kelas         : initial?.kelas          || '',
      no_telepon    : initial?.no_telepon     || '',
      alamat        : initial?.alamat         || '',
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? pasienAPI.update(initial.id, d) : pasienAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? 'Data pasien diperbarui' : 'Pasien berhasil didaftarkan');
      qc.invalidateQueries(['pasien']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? 'Edit data pasien' : 'Daftar pasien baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            {isEdit && (
              <div className="px-3 py-2 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                No. RM: <span className="font-mono font-bold text-primary-dark">{initial.no_rm}</span>
              </div>
            )}
            <div>
              <label className="label">Nama lengkap *</label>
              <input
                className={`input ${errors.nama ? 'input-error' : ''}`}
                placeholder="Nama lengkap pasien"
                {...register('nama', { required: 'Nama wajib diisi' })}
              />
              {errors.nama && <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tanggal lahir</label>
                <input type="date" className="input" {...register('tanggal_lahir')} />
              </div>
              <div>
                <label className="label">Jenis kelamin</label>
                <select className="input" {...register('jenis_kelamin')}>
                  <option value="">-- Pilih --</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Kelas / jabatan</label>
                <input className="input" placeholder="cth: X IPA 1" {...register('kelas')} />
              </div>
              <div>
                <label className="label">Nomor telepon</label>
                <input className="input" type="tel" {...register('no_telepon')} />
              </div>
            </div>
            <div>
              <label className="label">Alamat</label>
              <textarea className="input" rows={2} {...register('alamat')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : (isEdit ? 'Simpan data' : 'Daftarkan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetailModal({ open, onClose, pasienId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pasien-detail', pasienId],
    queryFn: () => pasienAPI.getById(pasienId).then((r) => r.data.data),
    enabled: open && !!pasienId,
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Detail pasien</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ['No. RM', <span className="font-mono font-bold text-primary">{data?.no_rm}</span>],
                  ['Nama lengkap', data?.nama],
                  ['Tanggal lahir', formatDate(data?.tanggal_lahir)],
                  ['Usia', hitungUmur(data?.tanggal_lahir)],
                  ['Jenis kelamin', data?.jenis_kelamin || '-'],
                  ['Kelas', data?.kelas || '-'],
                  ['Telepon', data?.no_telepon || '-'],
                  ['Alamat', data?.alamat || '-'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-text-secondary mb-0.5">{k}</p>
                    <p className="font-medium text-text-primary">{v}</p>
                  </div>
                ))}
              </div>

              {data?.riwayat_kunjungan?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-2">Riwayat kunjungan</p>
                  <div className="space-y-2">
                    {data.riwayat_kunjungan.slice(0, 5).map((k) => (
                      <div key={k.id} className="flex items-start gap-3 p-3 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{formatDate(k.tanggal)}</p>
                          <p className="text-text-secondary">{k.keluhan || '-'} — Dr. {k.nama_dokter || '-'}</p>
                          {k.diagnosa && <p className="text-xs text-text-secondary mt-0.5">Diagnosa: {k.diagnosa}</p>}
                        </div>
                        <span className={`badge ${k.status === 'selesai' ? 'badge-green' : 'badge-yellow'}`}>
                          {k.status}
                        </span>
                      </div>
                    ))}
                  </div>
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

export default function Pasien() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const qc       = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(null);
  const [delId, setDelId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pasien', search, page],
    queryFn: () => pasienAPI.getAll({ search, page, limit: 15 }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const delMut = useMutation({
    mutationFn: () => pasienAPI.remove(delId),
    onSuccess: () => {
      toast.success('Data pasien dihapus');
      qc.invalidateQueries(['pasien']);
      setDelId(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleSearch = useCallback((v) => { setSearch(v); setPage(1); }, []);

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Data pasien</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Total {data?.pagination?.total ?? 0} pasien terdaftar
            </p>
          </div>
          {/* Hanya admin yang bisa mendaftarkan pasien baru */}
          {isAdmin && (
            <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Daftar pasien
            </button>
          )}
        </div>

        <div className="px-6 py-3 border-b border-border">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Cari nama, No. RM, kelas..."
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState
            title="Belum ada data pasien"
            description="Data tidak ditemukan. Coba kata kunci lain atau daftarkan pasien baru."
            action={
              isAdmin && (
                <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Daftar pasien
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>No. RM</th><th>Nama</th><th>Usia / JK</th>
                    <th>Kelas</th><th>Telepon</th><th>Terdaftar</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-primary font-semibold">{p.no_rm}</td>
                      <td className="font-medium text-text-primary">{p.nama}</td>
                      <td className="text-text-secondary">
                        {hitungUmur(p.tanggal_lahir)} / {p.jenis_kelamin || '-'}
                      </td>
                      <td className="text-text-secondary">{p.kelas || '-'}</td>
                      <td className="text-text-secondary">{p.no_telepon || '-'}</td>
                      <td className="text-text-secondary text-xs">{formatDate(p.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Lihat detail — semua role */}
                          <button
                            onClick={() => setModal({ type: 'detail', id: p.id })}
                            className="p-1.5 rounded-[6px] hover:bg-status-info-bg text-status-info"
                            title="Lihat detail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit & hapus — hanya admin */}
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setModal({ type: 'edit', data: p })}
                                className="p-1.5 rounded-[6px] hover:bg-status-warning-bg text-status-warning"
                                title="Edit data"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDelId(p.id)}
                                className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger"
                                title="Hapus"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {isAdmin && (
        <>
          <PasienModal
            open={modal?.type === 'add' || modal?.type === 'edit'}
            initial={modal?.type === 'edit' ? modal.data : null}
            onClose={() => setModal(null)}
          />
          <ConfirmDialog
            open={!!delId}
            title="Hapus data pasien?"
            message="Data pasien akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan."
            onConfirm={() => delMut.mutate()}
            onCancel={() => setDelId(null)}
            loading={delMut.isPending}
          />
        </>
      )}
      <DetailModal
        open={modal?.type === 'detail'}
        pasienId={modal?.id}
        onClose={() => setModal(null)}
      />
    </div>
  );
}
