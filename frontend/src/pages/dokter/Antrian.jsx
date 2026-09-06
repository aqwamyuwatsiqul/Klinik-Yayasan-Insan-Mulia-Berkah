import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { kunjunganAPI, rekamMedisAPI, resepAPI, obatAPI, tarifAPI } from '../../api';
import { formatDateTime, hitungUmur, getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { ClipboardList, X, Plus, Trash2, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

// ── Modal Selesai Periksa (kunjungan tanpa resep) ─────────────────────────
function SelesaikanModal({ open, onClose, kunjungan }) {
  const qc = useQueryClient();
  const [selectedTarif, setSelectedTarif] = useState([]);

  const { data: tarifList } = useQuery({
    queryKey: ['tarif-select'],
    queryFn: () => tarifAPI.getAll({ aktif: '1', limit: 100 }).then(r => r.data.data.data),
    enabled: open,
  });

  const mut = useMutation({
    mutationFn: () => kunjunganAPI.selesaikan(kunjungan.id, { tarif_ids: selectedTarif }),
    onSuccess: () => {
      toast.success('Kunjungan selesai, diteruskan ke kasir');
      qc.invalidateQueries(['antrian-dokter']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const toggleTarif = (id) =>
    setSelectedTarif(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Selesai periksa</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {kunjungan?.nama_pasien} — {kunjungan?.no_rm}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body space-y-4">
          <div className="px-3 py-2.5 bg-status-info-bg border border-blue-200 rounded-[8px] text-sm text-blue-800">
            Pilih tarif layanan untuk kunjungan ini. Tarif akan dicatat sebagai rincian tagihan untuk kasir.
          </div>

          {!tarifList?.length ? (
            <p className="text-sm text-text-secondary text-center py-4">
              Belum ada master tarif. Owner/Admin dapat menambahkan di menu Tarif Layanan.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {tarifList.map(t => {
                const checked = selectedTarif.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] border cursor-pointer transition-colors ${
                      checked ? 'border-primary bg-primary-tint' : 'border-border hover:bg-surface-page'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTarif(t.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{t.nama}</p>
                      {t.jenis && <p className="text-xs text-text-secondary">{t.jenis}</p>}
                    </div>
                    <span className="text-sm font-semibold text-primary-dark flex-shrink-0">
                      Rp {Number(t.harga).toLocaleString('id')}
                    </span>
                    {t.jenis_pasien && (
                      <span className="badge badge-gray text-[10px]">{t.jenis_pasien}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {selectedTarif.length > 0 && (
            <p className="text-xs text-primary font-medium">
              {selectedTarif.length} tarif dipilih
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="btn-primary"
          >
            {mut.isPending ? <Spinner size="sm" /> : (
              <><CheckCircle2 className="w-4 h-4" /> Selesai & teruskan ke kasir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal periksa pasien (rekam medis + resep) ────────────────────────────
function PeriksaModal({ open, onClose, kunjungan }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('rekam');

  /* ── Rekam medis ── */
  const rmForm = useForm();
  const rmMut = useMutation({
    mutationFn: (d) => rekamMedisAPI.create({ ...d, kunjungan_id: kunjungan?.id }),
    onSuccess: () => {
      toast.success('Rekam medis berhasil disimpan');
      qc.invalidateQueries(['antrian-dokter']);
      setTab('resep');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  /* ── Resep ── */
  const { register: rr, handleSubmit: hr, control } = useForm({
    defaultValues: { items: [{ obat_id: '', jumlah: 1, dosis: '', aturan_pakai: '' }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const resepMut = useMutation({
    mutationFn: (d) => resepAPI.create({ ...d, kunjungan_id: kunjungan?.id }),
    onSuccess: () => {
      toast.success('Resep berhasil dikirim ke apoteker');
      qc.invalidateQueries(['antrian-dokter']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const { data: obatList } = useQuery({
    queryKey: ['obat-select'],
    queryFn: () => obatAPI.getAll({ limit: 200 }).then((r) => r.data.data.data),
  });
  const { data: existRM } = useQuery({
    queryKey: ['rm-kj', kunjungan?.id],
    queryFn: () =>
      rekamMedisAPI.getByKunjungan(kunjungan?.id).then((r) => r.data.data).catch(() => null),
    enabled: open && !!kunjungan?.id,
  });

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Periksa pasien</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {kunjungan?.nama_pasien} — {kunjungan?.no_rm} |{' '}
              {hitungUmur(kunjungan?.tanggal_lahir)} | {kunjungan?.jenis_kelamin || '-'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-[8px] hover:bg-surface-page" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-border px-6">
          {[{ id: 'rekam', l: 'Rekam medis' }, { id: 'resep', l: 'Resep obat' }].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary-dark'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'rekam' && (
          <form onSubmit={rmForm.handleSubmit((d) => rmMut.mutate(d))}>
            <div className="modal-body space-y-4">
              {existRM && (
                <div className="px-3 py-2 bg-status-warning-bg border border-yellow-200 rounded-[8px] text-xs text-amber-700">
                  Rekam medis sudah diisi. Lanjut ke tab resep obat.
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['Tekanan darah', 'tekanan_darah', '120/80'],
                  ['Suhu (°C)',     'suhu',          '36.5'  ],
                  ['BB (kg)',        'berat_badan',   '60'    ],
                  ['TB (cm)',        'tinggi_badan',  '170'   ],
                ].map(([l, n, p]) => (
                  <div key={n}>
                    <label className="label">{l}</label>
                    <input className="input" placeholder={p} {...rmForm.register(n)} />
                  </div>
                ))}
              </div>
              <div>
                <label className="label">Keluhan</label>
                <textarea className="input" rows={2} {...rmForm.register('keluhan')} defaultValue={kunjungan?.keluhan} />
              </div>
              <div>
                <label className="label">Pemeriksaan fisik</label>
                <textarea className="input" rows={2} {...rmForm.register('pemeriksaan')} />
              </div>
              <div>
                <label className="label">Diagnosa *</label>
                <textarea
                  className={`input ${rmForm.formState.errors.diagnosa ? 'input-error' : ''}`}
                  rows={2}
                  {...rmForm.register('diagnosa', { required: 'Diagnosa wajib diisi' })}
                />
                {rmForm.formState.errors.diagnosa && (
                  <p className="text-xs text-status-danger mt-1">{rmForm.formState.errors.diagnosa.message}</p>
                )}
              </div>
              <div>
                <label className="label">Terapi / tindakan</label>
                <textarea className="input" rows={2} {...rmForm.register('terapi')} />
              </div>
              <div>
                <label className="label">Catatan tambahan</label>
                <textarea className="input" rows={2} {...rmForm.register('catatan')} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">Tutup</button>
              {!existRM ? (
                <button type="submit" disabled={rmMut.isPending} className="btn-primary">
                  {rmMut.isPending ? <Spinner size="sm" /> : 'Simpan & lanjut ke resep →'}
                </button>
              ) : (
                <button type="button" onClick={() => setTab('resep')} className="btn-primary">
                  Lanjut ke resep →
                </button>
              )}
            </div>
          </form>
        )}

        {tab === 'resep' && (
          <form onSubmit={hr((d) => resepMut.mutate(d))}>
            <div className="modal-body space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Daftar obat</p>
                <button
                  type="button"
                  onClick={() => append({ obat_id: '', jumlah: 1, dosis: '', aturan_pakai: '' })}
                  className="btn-ghost btn-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah obat
                </button>
              </div>
              {fields.map((f, idx) => (
                <div key={f.id} className="p-4 bg-primary-tint rounded-[12px] border border-primary/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <label className="label">Obat *</label>
                      <select className="input" {...rr(`items.${idx}.obat_id`, { required: true })}>
                        <option value="">-- Pilih obat --</option>
                        {obatList?.map((o) => (
                          <option key={o.id} value={o.id} disabled={o.stok === 0}>
                            {o.nama} ({o.satuan}) — Stok: {o.stok}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="label">Jumlah *</label>
                      <input type="number" min="1" className="input" {...rr(`items.${idx}.jumlah`, { required: true, min: 1 })} />
                    </div>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(idx)}
                        className="mt-6 p-1.5 rounded-[6px] hover:bg-status-danger-bg text-status-danger" aria-label="Hapus obat">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Dosis</label>
                      <input className="input" placeholder="cth: 3x1" {...rr(`items.${idx}.dosis`)} />
                    </div>
                    <div>
                      <label className="label">Aturan pakai</label>
                      <input className="input" placeholder="cth: Sesudah makan" {...rr(`items.${idx}.aturan_pakai`)} />
                    </div>
                  </div>
                </div>
              ))}
              <div>
                <label className="label">Catatan resep</label>
                <textarea className="input" rows={2} {...rr('catatan')} />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">Tutup</button>
              <button type="submit" disabled={resepMut.isPending} className="btn-primary">
                {resepMut.isPending ? <Spinner size="sm" /> : 'Kirim resep ke apoteker'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AntrianDokter() {
  const qc = useQueryClient();
  const tanggal  = dayjs().format('YYYY-MM-DD');
  const [selected,   setSelected  ] = useState(null);
  const [selesaikan, setSelesaikan] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['antrian-dokter', tanggal],
    queryFn: () => kunjunganAPI.getAntrian({ tanggal }).then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const startMut = useMutation({
    mutationFn: (id) => kunjunganAPI.updateStatus(id, { status: 'diperiksa' }),
    onSuccess: () => qc.invalidateQueries(['antrian-dokter']),
  });

  const list = data || [];
  const counts = {
    menunggu      : list.filter((k) => k.status === 'menunggu').length,
    diperiksa     : list.filter((k) => k.status === 'diperiksa').length,
    menunggu_bayar: list.filter((k) => k.status === 'menunggu_bayar').length,
    selesai       : list.filter((k) => k.status === 'selesai').length,
  };

  const borderColor = {
    menunggu      : 'border-l-status-warning',
    diperiksa     : 'border-l-status-info',
    menunggu_bayar: 'border-l-status-danger',
    selesai       : 'border-l-status-success',
    batal         : 'border-l-border',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-primary-dark">Antrian pasien</h2>
          <p className="text-sm text-text-secondary">{dayjs(tanggal).format('dddd, DD MMMM YYYY')}</p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { l: 'Menunggu',       v: counts.menunggu,       c: 'text-status-warning' },
            { l: 'Diperiksa',      v: counts.diperiksa,      c: 'text-status-info'    },
            { l: 'Menunggu bayar', v: counts.menunggu_bayar, c: 'text-status-danger'  },
            { l: 'Selesai',        v: counts.selesai,        c: 'text-status-success' },
          ].map(({ l, v, c }) => (
            <div key={l} className="text-center">
              <p className={`text-xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-text-secondary">{l}</p>
            </div>
          ))}
          <button onClick={() => refetch()} className="btn-secondary btn-sm" title="Perbarui antrian">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !list.length ? (
        <EmptyState title="Tidak ada antrian hari ini" description="Pasien yang mendaftar akan muncul di sini secara otomatis." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((k) => (
            <div key={k.id} className={`card p-4 border-l-4 ${borderColor[k.status] || 'border-l-border'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-text-primary">{k.nama_pasien}</p>
                  <p className="text-xs text-text-secondary">{k.no_rm} | {k.kelas || '-'}</p>
                </div>
                <span className={`badge ${
                  k.status === 'menunggu'       ? 'badge-yellow' :
                  k.status === 'diperiksa'      ? 'badge-blue'   :
                  k.status === 'menunggu_bayar' ? 'badge-red'    :
                  k.status === 'selesai'        ? 'badge-green'  : 'badge-gray'
                }`}>
                  {k.status === 'menunggu_bayar' ? 'Menunggu bayar' : k.status}
                </span>
              </div>

              {k.keluhan && (
                <p className="text-xs text-text-secondary mb-2 line-clamp-2">Keluhan: {k.keluhan}</p>
              )}
              <p className="text-xs text-text-secondary mb-3">{formatDateTime(k.waktu_daftar)}</p>

              {k.status === 'menunggu' && (
                <button
                  onClick={() => { startMut.mutate(k.id); setSelected(k); }}
                  className="btn-primary btn-sm w-full"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> Mulai periksa
                </button>
              )}
              {k.status === 'diperiksa' && (
                <div className="flex gap-2">
                  <button onClick={() => setSelected(k)} className="btn-ghost btn-sm flex-1">
                    <ClipboardList className="w-3.5 h-3.5" /> Isi rekam medis
                  </button>
                  {/* Selesai periksa tanpa resep → teruskan ke kasir */}
                  {!k.resep_id && (
                    <button
                      onClick={() => setSelesaikan(k)}
                      className="btn-secondary btn-sm flex-1"
                      title="Selesai periksa tanpa resep"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                    </button>
                  )}
                </div>
              )}
              {k.status === 'menunggu_bayar' && (
                <div className="flex gap-2 text-xs">
                  <span className="badge-red badge">Menunggu pembayaran di kasir</span>
                </div>
              )}
              {k.status === 'selesai' && (
                <div className="flex gap-2 text-xs">
                  <span className="badge-green badge">Selesai</span>
                  {k.resep_id && <span className="badge-blue badge">Resep terkirim</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <PeriksaModal
          open={!!selected}
          kunjungan={selected}
          onClose={() => { setSelected(null); qc.invalidateQueries(['antrian-dokter']); }}
        />
      )}
      {selesaikan && (
        <SelesaikanModal
          open={!!selesaikan}
          kunjungan={selesaikan}
          onClose={() => setSelesaikan(null)}
        />
      )}
    </div>
  );
}
