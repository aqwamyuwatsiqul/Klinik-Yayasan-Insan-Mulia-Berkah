import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { userAPI } from '../../api';
import { formatDate, roleLabel, getErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Spinner from '../../components/common/Spinner';
import { Plus, Pencil, Trash2, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';

const roleBadge = {
  owner:    'badge-yellow',
  admin:    'badge-red',
  dokter:   'badge-blue',
  apoteker: 'badge-green',
  kasir:    'badge-gray',
};

function UserModal({ open, onClose, initial }) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      nama     : initial?.nama     || '',
      username : initial?.username || '',
      role     : initial?.role     || '',
      email    : initial?.email    || '',
      aktif    : initial?.aktif    ?? true,
    },
  });
  const role = watch('role');

  // Reset saat data berubah
  useEffect(() => {
    reset({
      nama     : initial?.nama     || '',
      username : initial?.username || '',
      role     : initial?.role     || '',
      email    : initial?.email    || '',
      aktif    : initial?.aktif    ?? true,
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? userAPI.update(initial.id, d) : userAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? 'Data user diperbarui' : 'User baru berhasil dibuat');
      qc.invalidateQueries(['users']);
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
            {isEdit ? 'Edit user' : 'Tambah user baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nama lengkap *</label>
              <input
                className={`input ${errors.nama ? 'input-error' : ''}`}
                {...register('nama', { required: 'Nama wajib diisi' })}
              />
              {errors.nama && <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Username *</label>
                <input
                  className="input"
                  {...register('username', { required: 'Wajib diisi' })}
                  readOnly={isEdit}
                />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" {...register('role', { required: 'Wajib dipilih' })}>
                  <option value="">-- Pilih role --</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="dokter">Dokter</option>
                  <option value="apoteker">Apoteker</option>
                  <option value="kasir">Kasir</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" {...register('email')} />
            </div>
            {role === 'dokter' && !isEdit && (
              <div>
                <label className="label">Spesialisasi</label>
                <input className="input" placeholder="cth: Dokter Umum" {...register('spesialisasi')} />
              </div>
            )}
            {!isEdit && (
              <div>
                <label className="label">Password *</label>
                <input
                  type="password"
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  {...register('password', {
                    required: 'Password wajib diisi',
                    minLength: { value: 8, message: 'Minimal 8 karakter' },
                  })}
                />
                {errors.password && (
                  <p className="text-xs text-status-danger mt-1">{errors.password.message}</p>
                )}
              </div>
            )}
            {isEdit && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" {...register('aktif')} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-text-primary">Akun aktif</span>
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : (isEdit ? 'Simpan' : 'Buat user')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPwdModal({ open, onClose, userId }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (d) => userAPI.resetPassword(userId, { password_baru: d.password }),
    onSuccess: () => {
      toast.success('Password berhasil direset');
      qc.invalidateQueries(['users']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Reset password</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body">
            <label className="label">Password baru *</label>
            <input
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder="Minimal 8 karakter"
              {...register('password', {
                required: 'Wajib diisi',
                minLength: { value: 8, message: 'Minimal 8 karakter' },
              })}
            />
            {errors.password && (
              <p className="text-xs text-status-danger mt-1">{errors.password.message}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : 'Reset password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [modal, setModal]   = useState(null);
  const [delId, setDelId]   = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => userAPI.getAll({ search, page, limit: 15 }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const delMut = useMutation({
    mutationFn: () => userAPI.remove(delId),
    onSuccess: () => {
      toast.success('User dihapus');
      qc.invalidateQueries(['users']);
      setDelId(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Manajemen user</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {data?.pagination?.total ?? 0} user terdaftar
            </p>
          </div>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Tambah user
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Cari nama atau username..."
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama</th><th>Username</th><th>Role</th>
                    <th>Email</th><th>Status</th><th>Terdaftar</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data?.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium text-text-primary">{u.nama}</td>
                      <td className="font-mono text-sm text-text-secondary">@{u.username}</td>
                      <td>
                        <span className={`badge ${roleBadge[u.role] || 'badge-gray'}`}>
                          {roleLabel(u.role)}
                        </span>
                      </td>
                      <td className="text-text-secondary text-sm">{u.email || '-'}</td>
                      <td>
                        <span className={`badge ${u.aktif ? 'badge-green' : 'badge-red'}`}>
                          {u.aktif ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td className="text-text-secondary text-xs">{formatDate(u.created_at)}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ type: 'edit', data: u })}
                            className="p-1.5 rounded-[6px] hover:bg-status-warning-bg text-status-warning"
                            title="Edit user"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'reset', id: u.id })}
                            className="p-1.5 rounded-[6px] hover:bg-status-info-bg text-status-info"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== me?.id && (
                            <button
                              onClick={() => setDelId(u.id)}
                              className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger"
                              title="Hapus user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={data?.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      <UserModal
        open={modal?.type === 'add' || modal?.type === 'edit'}
        initial={modal?.type === 'edit' ? modal.data : null}
        onClose={() => setModal(null)}
      />
      <ResetPwdModal
        open={modal?.type === 'reset'}
        userId={modal?.id}
        onClose={() => setModal(null)}
      />
      <ConfirmDialog
        open={!!delId}
        title="Hapus user?"
        message="Akun user akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => delMut.mutate()}
        onCancel={() => setDelId(null)}
        loading={delMut.isPending}
      />
    </div>
  );
}
