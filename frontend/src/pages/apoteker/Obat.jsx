import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { obatAPI } from '../../api';
import { formatDate, formatCurrency, getErrorMessage } from '../../utils/helpers';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { Plus, Pencil, Trash2, X, AlertTriangle, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';

/* ── Modal tambah / edit obat ── */
function ObatModal({ open, onClose, initial }) {
  const qc = useQueryClient();
  const isEdit = !!initial;

  const toDateInput = (v) => v ? v.toString().slice(0, 10) : '';

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      nama               : initial?.nama               || '',
      jenis              : initial?.jenis              || '',
      satuan             : initial?.satuan             || '',
      stok               : initial?.stok               ?? 0,
      stok_minimum       : initial?.stok_minimum       ?? 10,
      harga              : initial?.harga              ?? 0,
      tanggal_kadaluarsa : toDateInput(initial?.tanggal_kadaluarsa),
      keterangan         : initial?.keterangan         || '',
    },
  });

  // Reset saat data berubah
  useEffect(() => {
    reset({
      nama               : initial?.nama               || '',
      jenis              : initial?.jenis              || '',
      satuan             : initial?.satuan             || '',
      stok               : initial?.stok               ?? 0,
      stok_minimum       : initial?.stok_minimum       ?? 10,
      harga              : initial?.harga              ?? 0,
      tanggal_kadaluarsa : toDateInput(initial?.tanggal_kadaluarsa),
      keterangan         : initial?.keterangan         || '',
    });
  }, [initial, reset]);

  const mutation = useMutation({
    mutationFn: (d) => isEdit ? obatAPI.update(initial.id, d) : obatAPI.create(d),
    onSuccess: () => {
      toast.success(isEdit ? 'Data obat diperbarui' : 'Obat berhasil ditambahkan');
      qc.invalidateQueries(['obat']);
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
            {isEdit ? 'Edit data obat' : 'Tambah obat baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            {isEdit && (
              <div className="px-3 py-2 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                Kode: <span className="font-mono font-bold text-primary-dark">{initial.kode_obat}</span>
              </div>
            )}
            <div>
              <label className="label">Nama obat *</label>
              <input
                className={`input ${errors.nama ? 'input-error' : ''}`}
                {...register('nama', { required: 'Nama wajib diisi' })}
              />
              {errors.nama && <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Jenis</label>
                <input className="input" placeholder="cth: Analgesik" {...register('jenis')} />
              </div>
              <div>
                <label className="label">Satuan *</label>
                <input
                  className={`input ${errors.satuan ? 'input-error' : ''}`}
                  placeholder="cth: Tablet"
                  {...register('satuan', { required: 'Satuan wajib diisi' })}
                />
                {errors.satuan && <p className="text-xs text-status-danger mt-1">{errors.satuan.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {!isEdit && (
                <div>
                  <label className="label">Stok awal</label>
                  <input type="number" min="0" className="input" defaultValue={0} {...register('stok')} />
                </div>
              )}
              <div>
                <label className="label">Stok minimum</label>
                <input type="number" min="0" className="input" defaultValue={10} {...register('stok_minimum')} />
              </div>
              <div>
                <label className="label">Harga (Rp)</label>
                <input type="number" min="0" className="input" defaultValue={0} {...register('harga')} />
              </div>
            </div>
            <div>
              <label className="label">Tanggal kadaluarsa</label>
              <input type="date" className="input" {...register('tanggal_kadaluarsa')} />
            </div>
            <div>
              <label className="label">Keterangan</label>
              <textarea className="input" rows={2} {...register('keterangan')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : (isEdit ? 'Simpan data' : 'Tambahkan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal update stok ── */
function StokModal({ open, onClose, obat }) {
  const qc = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { tipe: 'masuk', jumlah: 1 },
  });
  const tipe = watch('tipe');

  const mutation = useMutation({
    mutationFn: (d) => obatAPI.updateStok(obat.id, { ...d, jumlah: parseInt(d.jumlah) }),
    onSuccess: () => {
      toast.success('Stok obat berhasil diperbarui');
      qc.invalidateQueries(['obat']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-sm">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">Perbarui stok obat</h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-4">
            <div className="px-3 py-2 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
              <p className="font-semibold text-primary-dark">{obat?.nama}</p>
              <p className="text-text-secondary">
                Stok saat ini:{' '}
                <span className="font-bold text-text-primary">{obat?.stok} {obat?.satuan}</span>
              </p>
            </div>
            <div>
              <label className="label">Tipe perubahan</label>
              <select className="input" {...register('tipe', { required: true })}>
                <option value="masuk">Masuk (tambah stok)</option>
                <option value="keluar">Keluar (kurangi stok)</option>
                <option value="koreksi">Koreksi (set stok baru)</option>
              </select>
            </div>
            <div>
              <label className="label">{tipe === 'koreksi' ? 'Stok baru' : 'Jumlah'} *</label>
              <input
                type="number" min="1"
                className={`input ${errors.jumlah ? 'input-error' : ''}`}
                {...register('jumlah', {
                  required: true,
                  min: { value: 1, message: 'Minimal 1' },
                  valueAsNumber: true,
                })}
              />
              {errors.jumlah && (
                <p className="text-xs text-status-danger mt-1">{errors.jumlah.message}</p>
              )}
            </div>
            <div>
              <label className="label">Keterangan</label>
              <input
                className="input"
                placeholder="cth: Pembelian dari supplier"
                {...register('keterangan')}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? <Spinner size="sm" /> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Halaman utama ── */
export default function Obat() {
  const qc = useQueryClient();
  const [search,      setSearch ] = useState('');
  const [page,        setPage   ] = useState(1);
  const [alertFilter, setAlert  ] = useState('');
  const [modal,       setModal  ] = useState(null);
  const [delId,       setDelId  ] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['obat', search, page, alertFilter],
    queryFn: () =>
      obatAPI.getAll({ search, page, limit: 15, alert: alertFilter || undefined })
        .then((r) => r.data.data),
    keepPreviousData: true,
  });

  const delMut = useMutation({
    mutationFn: () => obatAPI.remove(delId),
    onSuccess: () => {
      toast.success('Data obat dihapus');
      qc.invalidateQueries(['obat']);
      setDelId(null);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const alerts = data?.alerts;

  return (
    <div className="space-y-4">
      {/* Alert banners */}
      {(parseInt(alerts?.stok_rendah) > 0 || parseInt(alerts?.hampir_kadaluarsa) > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {parseInt(alerts?.stok_rendah) > 0 && (
            <button
              onClick={() => setAlert((v) => v === 'stok_rendah' ? '' : 'stok_rendah')}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border text-left transition-colors ${
                alertFilter === 'stok_rendah'
                  ? 'bg-status-warning-bg border-status-warning'
                  : 'bg-status-warning-bg border-yellow-200 hover:border-status-warning'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {alerts.stok_rendah} obat stok rendah
                </p>
                <p className="text-xs text-amber-600">Klik untuk filter</p>
              </div>
            </button>
          )}
          {parseInt(alerts?.hampir_kadaluarsa) > 0 && (
            <button
              onClick={() => setAlert((v) => v === 'kadaluarsa' ? '' : 'kadaluarsa')}
              className={`flex items-center gap-3 px-4 py-3 rounded-[12px] border text-left transition-colors ${
                alertFilter === 'kadaluarsa'
                  ? 'bg-status-danger-bg border-status-danger'
                  : 'bg-status-danger-bg border-red-200 hover:border-status-danger'
              }`}
            >
              <AlertTriangle className="w-5 h-5 text-status-danger flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">
                  {alerts.hampir_kadaluarsa} obat hampir kadaluarsa
                </p>
                <p className="text-xs text-red-600">Klik untuk filter (≤30 hari)</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Tabel obat */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="font-semibold text-text-primary">Data obat</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {data?.pagination?.total ?? 0} jenis obat
            </p>
          </div>
          <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Tambah obat
          </button>
        </div>

        <div className="px-6 py-3 border-b border-border flex items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Cari nama atau kode obat..."
            className="max-w-sm"
          />
          {alertFilter && (
            <button onClick={() => setAlert('')} className="btn-secondary btn-sm text-status-danger">
              <X className="w-3.5 h-3.5" /> Hapus filter
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !data?.data?.length ? (
          <EmptyState
            title="Belum ada data obat"
            description="Data tidak ditemukan. Coba kata kunci lain."
            action={
              <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
                <Plus className="w-4 h-4" /> Tambah obat
              </button>
            }
          />
        ) : (
          <>
            <div className="table-wrapper rounded-none border-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th><th>Nama obat</th><th>Jenis</th>
                    <th>Stok</th><th>Satuan</th><th>Harga</th>
                    <th>Kadaluarsa</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs text-text-secondary">{o.kode_obat}</td>
                      <td>
                        <p className="font-medium text-text-primary">{o.nama}</p>
                        {o.keterangan && (
                          <p className="text-xs text-text-secondary truncate max-w-xs">{o.keterangan}</p>
                        )}
                      </td>
                      <td className="text-text-secondary">{o.jenis || '-'}</td>
                      <td>
                        <span className={`font-bold ${o.stok_rendah ? 'text-status-danger' : 'text-text-primary'}`}>
                          {o.stok}
                        </span>
                        {o.stok_rendah && (
                          <span className="ml-1.5 badge badge-red">Rendah</span>
                        )}
                      </td>
                      <td className="text-text-secondary">{o.satuan}</td>
                      <td className="text-text-secondary">{formatCurrency(o.harga)}</td>
                      <td>
                        <span className={o.hampir_kadaluarsa ? 'text-status-danger font-semibold' : 'text-text-secondary'}>
                          {o.tanggal_kadaluarsa ? formatDate(o.tanggal_kadaluarsa, 'DD/MM/YYYY') : '-'}
                        </span>
                        {o.hampir_kadaluarsa && (
                          <span className="ml-1 badge badge-red">!</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setModal({ type: 'stok', data: o })}
                            className="p-1.5 rounded-[6px] hover:bg-status-success-bg text-status-success"
                            title="Perbarui stok"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setModal({ type: 'edit', data: o })}
                            className="p-1.5 rounded-[6px] hover:bg-status-warning-bg text-status-warning"
                            title="Edit data"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelId(o.id)}
                            className="p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger"
                            title="Hapus obat"
                          >
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

      <ObatModal
        open={modal?.type === 'add' || modal?.type === 'edit'}
        initial={modal?.type === 'edit' ? modal.data : null}
        onClose={() => setModal(null)}
      />
      <StokModal
        open={modal?.type === 'stok'}
        obat={modal?.data}
        onClose={() => setModal(null)}
      />
      <ConfirmDialog
        open={!!delId}
        title="Hapus data obat?"
        message="Data obat akan dihapus dari sistem. Tindakan ini tidak dapat dibatalkan."
        onConfirm={() => delMut.mutate()}
        onCancel={() => setDelId(null)}
        loading={delMut.isPending}
      />
    </div>
  );
}
