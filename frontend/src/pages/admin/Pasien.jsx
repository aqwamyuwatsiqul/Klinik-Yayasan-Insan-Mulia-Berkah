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
import { Plus, Pencil, Trash2, Eye, X, AlertTriangle, Phone, GraduationCap, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Form tambah / edit pasien ──────────────────────────────────────────────
function PasienModal({ open, onClose, initial }) {
  const qc     = useQueryClient();
  const isEdit = !!initial;

  const toDateInput = (v) => v ? v.toString().slice(0, 10) : '';

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      jenis_pasien   : initial?.jenis_pasien  || 'siswa',
      nama           : initial?.nama          || '',
      tanggal_lahir  : toDateInput(initial?.tanggal_lahir),
      jenis_kelamin  : initial?.jenis_kelamin || '',
      kelas          : initial?.kelas         || '',
      nis            : initial?.nis           || '',
      nik            : initial?.nik           || '',
      no_telepon     : initial?.no_telepon    || '',
      alamat         : initial?.alamat        || '',
      nama_wali      : initial?.nama_wali     || '',
      telepon_wali   : initial?.telepon_wali  || '',
      hubungan_wali  : initial?.hubungan_wali || '',
      alergi         : initial?.alergi        || '',
      kondisi_khusus : initial?.kondisi_khusus || '',
      keterangan     : initial?.keterangan    || '',
    },
  });

  const jenisPasien = watch('jenis_pasien');
  const isSiswa     = jenisPasien === 'siswa';

  useEffect(() => {
    reset({
      jenis_pasien   : initial?.jenis_pasien  || 'siswa',
      nama           : initial?.nama          || '',
      tanggal_lahir  : toDateInput(initial?.tanggal_lahir),
      jenis_kelamin  : initial?.jenis_kelamin || '',
      kelas          : initial?.kelas         || '',
      nis            : initial?.nis           || '',
      nik            : initial?.nik           || '',
      no_telepon     : initial?.no_telepon    || '',
      alamat         : initial?.alamat        || '',
      nama_wali      : initial?.nama_wali     || '',
      telepon_wali   : initial?.telepon_wali  || '',
      hubungan_wali  : initial?.hubungan_wali || '',
      alergi         : initial?.alergi        || '',
      kondisi_khusus : initial?.kondisi_khusus || '',
      keterangan     : initial?.keterangan    || '',
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
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <h2 className="text-base font-semibold text-text-primary">
            {isEdit ? 'Edit data pasien' : 'Daftar pasien baru'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
          <div className="modal-body space-y-5">

            {/* No. RM (edit mode) */}
            {isEdit && (
              <div className="px-3 py-2 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                No. RM: <span className="font-mono font-bold text-primary-dark">{initial.no_rm}</span>
              </div>
            )}

            {/* ── JENIS PASIEN ── */}
            <div>
              <label className="label">Jenis pasien *</label>
              <div className="flex gap-4">
                {[
                  { val: 'siswa', label: 'Siswa sekolah', Icon: GraduationCap },
                  { val: 'umum',  label: 'Pasien umum',   Icon: UserCheck     },
                ].map(({ val, label, Icon }) => (
                  <label
                    key={val}
                    className={`flex items-center gap-2.5 flex-1 px-4 py-3 rounded-[10px] border-2 cursor-pointer transition-colors ${
                      jenisPasien === val
                        ? 'border-primary bg-primary-tint'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <input
                      type="radio"
                      value={val}
                      className="sr-only"
                      {...register('jenis_pasien')}
                    />
                    <Icon className={`w-4 h-4 flex-shrink-0 ${jenisPasien === val ? 'text-primary' : 'text-text-secondary'}`} />
                    <span className={`text-sm font-medium ${jenisPasien === val ? 'text-primary-dark' : 'text-text-secondary'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* ── IDENTITAS DASAR ── */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Identitas</p>
              <div className="space-y-4">
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

                {/* Field kondisional: siswa */}
                {isSiswa && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Kelas *</label>
                      <input
                        className={`input ${errors.kelas ? 'input-error' : ''}`}
                        placeholder="cth: X IPA 1"
                        {...register('kelas', { required: isSiswa ? 'Kelas wajib diisi untuk siswa' : false })}
                      />
                      {errors.kelas && <p className="text-xs text-status-danger mt-1">{errors.kelas.message}</p>}
                    </div>
                    <div>
                      <label className="label">NIS <span className="text-text-secondary font-normal">(opsional)</span></label>
                      <input
                        className="input"
                        placeholder="Nomor Induk Siswa"
                        {...register('nis')}
                      />
                    </div>
                  </div>
                )}

                {/* Field kondisional: umum */}
                {!isSiswa && (
                  <div>
                    <label className="label">NIK <span className="text-text-secondary font-normal">(opsional, 16 digit)</span></label>
                    <input
                      className={`input ${errors.nik ? 'input-error' : ''}`}
                      placeholder="Nomor Induk Kependudukan"
                      maxLength={16}
                      {...register('nik', {
                        pattern: { value: /^(\d{16})?$/, message: 'NIK harus 16 digit angka' },
                      })}
                    />
                    {errors.nik && <p className="text-xs text-status-danger mt-1">{errors.nik.message}</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nomor telepon</label>
                    <input className="input" type="tel" {...register('no_telepon')} />
                  </div>
                  <div>
                    <label className="label">Alamat</label>
                    <input className="input" placeholder="Alamat tempat tinggal" {...register('alamat')} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── KONTAK WALI / ORANG TUA ── */}
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Kontak wali / orang tua
                <span className="ml-1 text-text-secondary font-normal normal-case">(untuk keadaan darurat)</span>
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nama wali</label>
                    <input className="input" placeholder="Nama orang tua / wali" {...register('nama_wali')} />
                  </div>
                  <div>
                    <label className="label">Hubungan</label>
                    <input className="input" placeholder="cth: Ayah, Ibu, Wali" {...register('hubungan_wali')} />
                  </div>
                </div>
                <div>
                  <label className="label">Telepon wali</label>
                  <input className="input" type="tel" placeholder="Nomor yang bisa dihubungi" {...register('telepon_wali')} />
                </div>
              </div>
            </div>

            {/* ── RIWAYAT KESEHATAN PENTING ── */}
            <div className="rounded-[10px] border-2 border-status-warning bg-status-warning-bg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0" />
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Riwayat kesehatan penting
                </p>
                <span className="text-xs text-amber-700 font-normal">(wajib diisi jika ada — kritis saat darurat)</span>
              </div>
              <div>
                <label className="label">Alergi</label>
                <input
                  className="input"
                  placeholder="cth: Alergi penisilin, alergi udang, alergi debu"
                  {...register('alergi')}
                />
              </div>
              <div>
                <label className="label">Kondisi medis khusus</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="cth: Asma, diabetes, epilepsi, penyakit jantung bawaan"
                  {...register('kondisi_khusus')}
                />
              </div>
            </div>

            {/* Keterangan tambahan */}
            <div>
              <label className="label">Keterangan tambahan</label>
              <textarea className="input" rows={2} placeholder="Catatan lain yang perlu diketahui" {...register('keterangan')} />
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

// ── Banner peringatan medis ────────────────────────────────────────────────
function BannerMedisKritis({ alergi, kondisi_khusus }) {
  if (!alergi && !kondisi_khusus) return null;
  return (
    <div className="rounded-[10px] border-2 border-status-danger bg-status-danger-bg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-status-danger flex-shrink-0" />
        <p className="text-sm font-bold text-red-800 uppercase tracking-wide">
          ⚠ Informasi Medis Kritis — Baca Sebelum Penanganan
        </p>
      </div>
      {alergi && (
        <div>
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-0.5">Alergi</p>
          <p className="text-sm font-semibold text-red-900 bg-white/60 px-3 py-1.5 rounded-[6px]">{alergi}</p>
        </div>
      )}
      {kondisi_khusus && (
        <div>
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-0.5">Kondisi medis khusus</p>
          <p className="text-sm font-semibold text-red-900 bg-white/60 px-3 py-1.5 rounded-[6px]">{kondisi_khusus}</p>
        </div>
      )}
    </div>
  );
}

// ── Detail pasien ──────────────────────────────────────────────────────────
function DetailModal({ open, onClose, pasienId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['pasien-detail', pasienId],
    queryFn: () => pasienAPI.getById(pasienId).then((r) => r.data.data),
    enabled: open && !!pasienId,
  });

  if (!open) return null;
  const isSiswa = data?.jenis_pasien !== 'umum';

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">Detail pasien</h2>
            {data && (
              <span className={`badge ${isSiswa ? 'badge-blue' : 'badge-gray'}`}>
                {isSiswa ? 'Siswa' : 'Umum'}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : (
            <div className="space-y-5">

              {/* ⚠ Banner medis kritis — paling atas, paling menonjol */}
              <BannerMedisKritis alergi={data?.alergi} kondisi_khusus={data?.kondisi_khusus} />

              {/* Identitas dasar */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Identitas</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    ['No. RM',        <span className="font-mono font-bold text-primary">{data?.no_rm}</span>],
                    ['Nama lengkap',  data?.nama],
                    ['Tanggal lahir', formatDate(data?.tanggal_lahir)],
                    ['Usia',          hitungUmur(data?.tanggal_lahir)],
                    ['Jenis kelamin', data?.jenis_kelamin || '—'],
                    isSiswa
                      ? ['Kelas',  data?.kelas || '—']
                      : ['NIK',    data?.nik   || '—'],
                    ...(isSiswa && data?.nis ? [['NIS', data.nis]] : []),
                    ['Telepon',       data?.no_telepon || '—'],
                    ['Alamat',        data?.alamat     || '—'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-text-secondary mb-0.5">{k}</p>
                      <p className="font-medium text-text-primary">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kontak wali */}
              {(data?.nama_wali || data?.telepon_wali) && (
                <div className="rounded-[10px] bg-primary-tint border border-primary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs font-semibold text-primary-dark uppercase tracking-wide">
                      Kontak darurat — {data.hubungan_wali || 'Wali'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-text-secondary mb-0.5">Nama wali</p>
                      <p className="font-semibold text-text-primary">{data.nama_wali || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-0.5">Telepon</p>
                      <p className="font-semibold text-text-primary">{data.telepon_wali || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Keterangan */}
              {data?.keterangan && (
                <div>
                  <p className="text-xs text-text-secondary mb-0.5">Keterangan</p>
                  <p className="text-sm text-text-primary">{data.keterangan}</p>
                </div>
              )}

              {/* Riwayat kunjungan */}
              {data?.riwayat_kunjungan?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-text-primary mb-2">Riwayat kunjungan</p>
                  <div className="space-y-2">
                    {data.riwayat_kunjungan.slice(0, 5).map((k) => (
                      <div key={k.id} className="flex items-start gap-3 p-3 bg-primary-tint rounded-[8px] text-sm border border-primary/20">
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">{formatDate(k.tanggal)}</p>
                          <p className="text-text-secondary">{k.keluhan || '—'} — Dr. {k.nama_dokter || '—'}</p>
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

// ── Halaman utama ──────────────────────────────────────────────────────────
export default function Pasien() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const qc       = useQueryClient();
  const [search,      setSearch     ] = useState('');
  const [page,        setPage       ] = useState(1);
  const [jensFilter,  setJensFilter ] = useState('');   // '' | 'siswa' | 'umum'
  const [modal,       setModal      ] = useState(null);
  const [delId,       setDelId      ] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pasien', search, page, jensFilter],
    queryFn: () => pasienAPI.getAll({
      search,
      page,
      limit: 15,
      ...(jensFilter ? { jenis_pasien: jensFilter } : {}),
    }).then((r) => r.data.data),
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
          {isAdmin && (
            <button onClick={() => setModal({ type: 'add' })} className="btn-primary btn-sm">
              <Plus className="w-4 h-4" /> Daftar pasien
            </button>
          )}
        </div>

        {/* Search + filter jenis */}
        <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Cari nama, No. RM, kelas, NIS..."
            className="max-w-xs"
          />
          <div className="flex gap-1.5">
            {[
              { val: '',      label: 'Semua'  },
              { val: 'siswa', label: 'Siswa'  },
              { val: 'umum',  label: 'Umum'   },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => { setJensFilter(val); setPage(1); }}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                  jensFilter === val
                    ? 'bg-primary text-white'
                    : 'bg-surface-page text-text-secondary hover:bg-primary-tint hover:text-primary-dark'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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
                    <th>No. RM</th>
                    <th>Nama</th>
                    <th>Jenis</th>
                    <th>Usia / JK</th>
                    <th>Kelas / NIK</th>
                    <th>Telepon</th>
                    <th>Terdaftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((p) => {
                    const isSiswa      = p.jenis_pasien !== 'umum';
                    const hasMedisInfo = p.has_alergi || p.has_kondisi;
                    return (
                      <tr key={p.id}>
                        <td className="font-mono text-xs text-primary font-semibold">
                          {p.no_rm}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-text-primary">{p.nama}</span>
                            {hasMedisInfo && (
                              <span
                                title="Ada info medis kritis (alergi/kondisi khusus)"
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-status-danger text-white flex-shrink-0"
                                aria-label="Pasien memiliki informasi medis kritis"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isSiswa ? 'badge-blue' : 'badge-gray'}`}>
                            {isSiswa ? 'Siswa' : 'Umum'}
                          </span>
                        </td>
                        <td className="text-text-secondary">
                          {hitungUmur(p.tanggal_lahir)} / {p.jenis_kelamin || '—'}
                        </td>
                        <td className="text-text-secondary text-sm">
                          {isSiswa
                            ? (p.kelas || '—')
                            : (p.nik ? `NIK: ${p.nik}` : '—')
                          }
                        </td>
                        <td className="text-text-secondary">{p.no_telepon || '—'}</td>
                        <td className="text-text-secondary text-xs">{formatDate(p.created_at)}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setModal({ type: 'detail', id: p.id })}
                              className="p-1.5 rounded-[6px] hover:bg-status-info-bg text-status-info"
                              title="Lihat detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
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
                    );
                  })}
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
