import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { pembayaranAPI, tarifAPI } from '../../api';
import { formatCurrency, formatDateTime, getErrorMessage } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import { ArrowLeft, CheckCircle2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProsesBayar() {
  const { kunjunganId } = useParams();
  const navigate        = useNavigate();

  const [metodeBayar,    setMetodeBayar   ] = useState('tunai');
  const [nominalDiterima, setNominalDiterima] = useState('');
  const [catatan,        setCatatan       ] = useState('');
  // Tarif tambahan yang dipilih kasir
  const [tarifDipilih,   setTarifDipilih  ] = useState([]);

  // Preview tagihan dari server (item obat + info kunjungan)
  const { data: preview, isLoading: loadingPreview, isError } = useQuery({
    queryKey: ['preview-tagihan', kunjunganId],
    queryFn: () => pembayaranAPI.getPreview(kunjunganId).then(r => r.data.data),
    retry: false,
  });

  // Daftar tarif aktif untuk dipilih
  const { data: tarifList } = useQuery({
    queryKey: ['tarif-select'],
    queryFn: () => tarifAPI.getAll({ aktif: '1', limit: 100 }).then(r => r.data.data.data),
  });

  const mutation = useMutation({
    mutationFn: (payload) => pembayaranAPI.proses(kunjunganId, payload),
    onSuccess: (res) => {
      const pb = res.data.data;
      toast.success(`Pembayaran berhasil. Kembalian: ${formatCurrency(pb.kembalian || 0)}`);
      navigate('/kasir/antrian');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  // ── Hitung total ──────────────────────────────────────────────────────────
  const itemObat  = preview?.item_obat  || [];
  const totalObat = itemObat.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
  const totalTarif = tarifDipilih.reduce((s, t) => s + parseFloat(t.harga || 0), 0);
  const totalTagihan = totalObat + totalTarif;
  const nominal     = parseFloat(nominalDiterima) || 0;
  const kembalian   = metodeBayar === 'tunai' ? nominal - totalTagihan : 0;
  const kurang      = metodeBayar === 'tunai' && nominal > 0 && nominal < totalTagihan;

  const toggleTarif = (t) => {
    setTarifDipilih(prev =>
      prev.find(x => x.id === t.id) ? prev.filter(x => x.id !== t.id) : [...prev, t]
    );
  };

  const handleSubmit = () => {
    if (metodeBayar === 'tunai' && nominal < totalTagihan) {
      toast.error('Nominal pembayaran kurang dari total tagihan');
      return;
    }
    mutation.mutate({
      metode_bayar : metodeBayar,
      total_bayar  : metodeBayar === 'tunai' ? nominal : totalTagihan,
      catatan,
      tarif_ids    : tarifDipilih.map(t => t.id),
    });
  };

  if (loadingPreview) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  if (isError) return (
    <div className="card p-8 text-center space-y-3">
      <AlertTriangle className="w-10 h-10 text-status-danger mx-auto" />
      <p className="font-semibold text-text-primary">Tidak dapat memuat data tagihan</p>
      <p className="text-sm text-text-secondary">Kunjungan mungkin sudah dibayar atau tidak ditemukan.</p>
      <button onClick={() => navigate('/kasir/antrian')} className="btn-secondary btn-sm mx-auto">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
    </div>
  );

  const kj = preview?.kunjungan;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/kasir/antrian')} className="p-1.5 rounded-[8px] hover:bg-surface-page">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-primary-dark">Proses pembayaran</h2>
          <p className="text-sm text-text-secondary">{kj?.nama_pasien} — {kj?.no_rm}</p>
        </div>
      </div>

      {/* Info kunjungan */}
      <div className="card p-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Nama pasien',  kj?.nama_pasien],
            ['No. RM',       <span className="font-mono text-primary">{kj?.no_rm}</span>],
            ['Jenis pasien', kj?.jenis_pasien === 'siswa' ? 'Siswa' : 'Umum'],
            ['Dokter',       kj?.nama_dokter || '—'],
            ['Waktu daftar', formatDateTime(kj?.waktu_daftar)],
            ['Keluhan',      kj?.keluhan || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-text-secondary">{k}</p>
              <p className="font-medium text-text-primary">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rincian tagihan */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-text-primary">Rincian tagihan</h3>
        </div>
        <div className="divide-y divide-border">
          {/* Item obat */}
          {itemObat.length > 0 && (
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Obat / Resep</p>
              {itemObat.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 text-sm">
                  <div>
                    <span className="font-medium text-text-primary">{item.nama}</span>
                    <span className="text-text-secondary ml-2">×{item.jumlah}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tarif layanan yang dipilih */}
          {tarifDipilih.length > 0 && (
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Tarif Layanan</p>
              {tarifDipilih.map((t) => (
                <div key={t.id} className="flex justify-between items-center py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{t.nama}</span>
                    <button onClick={() => toggleTarif(t)} className="p-0.5 text-status-danger hover:bg-status-danger-bg rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-semibold">{formatCurrency(t.harga)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tambah tarif */}
          {tarifList?.length > 0 && (
            <div className="px-6 py-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Tambah tarif layanan</p>
              <div className="flex flex-wrap gap-2">
                {tarifList
                  .filter(t => !tarifDipilih.find(x => x.id === t.id))
                  .filter(t => !t.jenis_pasien || t.jenis_pasien === kj?.jenis_pasien)
                  .map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTarif(t)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] border border-border text-xs hover:border-primary hover:bg-primary-tint transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {t.nama} — {formatCurrency(t.harga)}
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* Total */}
          <div className="px-6 py-4 bg-primary-tint/50">
            <div className="flex justify-between items-center">
              <span className="font-bold text-text-primary">Total Tagihan</span>
              <span className="text-2xl font-bold text-primary-dark">{formatCurrency(totalTagihan)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pembayaran */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-text-primary">Pembayaran</h3>

        {/* Metode */}
        <div>
          <label className="label">Metode pembayaran</label>
          <div className="flex gap-2">
            {[
              { val: 'tunai',    label: 'Tunai'    },
              { val: 'transfer', label: 'Transfer' },
              { val: 'bpjs',     label: 'BPJS'     },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setMetodeBayar(val)}
                className={`flex-1 py-2 rounded-[8px] text-sm font-medium border-2 transition-colors ${
                  metodeBayar === val
                    ? 'border-primary bg-primary-tint text-primary-dark'
                    : 'border-border text-text-secondary hover:border-primary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Nominal (tunai saja) */}
        {metodeBayar === 'tunai' && (
          <div>
            <label className="label">Uang diterima (Rp)</label>
            <input
              type="number"
              min={totalTagihan}
              className={`input text-lg font-semibold ${kurang ? 'input-error' : ''}`}
              placeholder={`Minimal ${formatCurrency(totalTagihan)}`}
              value={nominalDiterima}
              onChange={e => setNominalDiterima(e.target.value)}
            />
            {kurang && (
              <p className="text-xs text-status-danger mt-1">
                Kurang {formatCurrency(totalTagihan - nominal)}
              </p>
            )}
            {nominal >= totalTagihan && nominal > 0 && (
              <div className="mt-2 px-3 py-2 bg-status-success-bg rounded-[8px] flex justify-between">
                <span className="text-sm font-semibold text-primary-dark">Kembalian</span>
                <span className="text-lg font-bold text-primary-dark">{formatCurrency(kembalian)}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Catatan <span className="text-text-secondary font-normal">(opsional)</span></label>
          <input className="input" placeholder="cth: Bayar sebagian, sisanya besok" value={catatan} onChange={e => setCatatan(e.target.value)} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={mutation.isPending || (metodeBayar === 'tunai' && nominal < totalTagihan)}
          className="btn-primary w-full py-3 text-base"
        >
          {mutation.isPending ? (
            <><Spinner size="sm" /> Memproses...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Konfirmasi Pembayaran {formatCurrency(totalTagihan)}</>
          )}
        </button>
      </div>
    </div>
  );
}
