import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { laporanAPI, dokterAPI } from '../../api';
import { formatDate, statusKunjunganLabel } from '../../utils/helpers';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import { FileDown, Search, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── PDF export helpers ─────────────────────────────────────────────────────
function exportKunjunganPDF(rows, filter) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const W   = doc.internal.pageSize.width;

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN KUNJUNGAN PASIEN', W / 2, 18, { align: 'center' });
  doc.setFontSize(9);  doc.setFont('helvetica', 'normal');
  doc.text('Klinik Yayasan Insan Mulia Berkah', W / 2, 25, { align: 'center' });
  doc.text('Melayani dengan hati, memberi dengan ikhlas', W / 2, 30, { align: 'center' });

  const periode = filter.tanggal_awal && filter.tanggal_akhir
    ? `${formatDate(filter.tanggal_awal)} — ${formatDate(filter.tanggal_akhir)}`
    : 'Semua periode';
  doc.text(`Periode  : ${periode}`, 14, 38);
  doc.text(`Dicetak  : ${dayjs().format('DD MMMM YYYY HH:mm')}`, 14, 43);
  doc.text(`Total    : ${rows.length} kunjungan`, 14, 48);

  autoTable(doc, {
    startY: 54,
    head: [['No', 'Tanggal', 'No. RM', 'Nama Pasien', 'Kelas', 'Dokter', 'Diagnosa', 'Status']],
    body: rows.map((k, i) => [
      i + 1, formatDate(k.tanggal), k.no_rm, k.nama_pasien,
      k.kelas || '-', k.nama_dokter || '-', k.diagnosa || '-', k.status,
    ]),
    headStyles:           { fillColor: [46, 125, 50], fontSize: 8 },
    bodyStyles:           { fontSize: 8 },
    alternateRowStyles:   { fillColor: [232, 245, 233] },
  });

  doc.save(`laporan-kunjungan-${dayjs().format('YYYY-MM-DD')}.pdf`);
  toast.success('Laporan kunjungan berhasil diexport');
}

function exportObatPDF(rows, filter) {
  const doc = new jsPDF();
  const W   = doc.internal.pageSize.width;

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN PENGGUNAAN OBAT', W / 2, 18, { align: 'center' });
  doc.setFontSize(9);  doc.setFont('helvetica', 'normal');
  doc.text('Klinik Yayasan Insan Mulia Berkah', W / 2, 25, { align: 'center' });
  doc.text('Melayani dengan hati, memberi dengan ikhlas', W / 2, 30, { align: 'center' });

  const periode = filter.tanggal_awal && filter.tanggal_akhir
    ? `${formatDate(filter.tanggal_awal)} — ${formatDate(filter.tanggal_akhir)}`
    : 'Semua periode';
  doc.text(`Periode  : ${periode}`, 14, 38);
  doc.text(`Dicetak  : ${dayjs().format('DD MMMM YYYY HH:mm')}`, 14, 43);

  autoTable(doc, {
    startY: 50,
    head: [['No', 'Kode Obat', 'Nama Obat', 'Satuan', 'Total Digunakan', 'Jumlah Resep']],
    body: rows.map((o, i) => [
      i + 1, o.kode_obat, o.nama_obat, o.satuan, o.total_digunakan, o.jumlah_resep,
    ]),
    headStyles:         { fillColor: [46, 125, 50], fontSize: 9 },
    bodyStyles:         { fontSize: 9 },
    alternateRowStyles: { fillColor: [232, 245, 233] },
  });

  doc.save(`laporan-obat-${dayjs().format('YYYY-MM-DD')}.pdf`);
  toast.success('Laporan penggunaan obat berhasil diexport');
}

// ── Komponen error inline ──────────────────────────────────────────────────
function QueryError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center px-4">
      <div className="w-12 h-12 rounded-[12px] bg-status-danger-bg flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-status-danger" />
      </div>
      <p className="text-sm font-semibold text-text-primary">Gagal memuat data</p>
      <p className="text-xs text-text-secondary">Terjadi kesalahan saat mengambil data dari server.</p>
      <button onClick={onRetry} className="btn-outline btn-sm mt-1">Coba lagi</button>
    </div>
  );
}

// ── Halaman utama ──────────────────────────────────────────────────────────
export default function Laporan() {
  const [tab, setTab] = useState('kunjungan');

  const initFilter = {
    tanggal_awal:  dayjs().startOf('month').format('YYYY-MM-DD'),
    tanggal_akhir: dayjs().format('YYYY-MM-DD'),
    dokter_id: '',
    status:    '',
  };
  const [filter,  setFilter ] = useState(initFilter);
  // applied dimulai dengan nilai yang sama agar data langsung muncul saat halaman dibuka
  const [applied, setApplied] = useState(initFilter);

  // ── Fetch daftar dokter untuk select filter ──
  const { data: dokterList } = useQuery({
    queryKey: ['dokter-select-laporan'],
    queryFn:  () => dokterAPI.getAll({ limit: 100 }).then((r) => r.data.data.data),
    staleTime: 5 * 60 * 1000, // 5 menit
  });

  // ── Fetch laporan kunjungan ──
  // enabled selalu true — tab switching ditangani via conditional render di bawah
  const {
    data: kjData, isLoading: kjLoading, isError: kjError, refetch: kjRefetch,
  } = useQuery({
    queryKey: ['lap-kj', applied],
    queryFn:  () => laporanAPI.getLaporanKunjungan(applied).then((r) => r.data.data),
    // Selalu fetch saat key berubah, tidak dibatasi oleh tab
    enabled:      true,
    staleTime:    0,      // selalu fresh saat applied berubah
    retry:        2,
    retryDelay:   1000,
  });

  // ── Fetch laporan obat ──
  const {
    data: obatData, isLoading: obatLoading, isError: obatError, refetch: obatRefetch,
  } = useQuery({
    queryKey: ['lap-obat', applied],
    queryFn:  () => laporanAPI.getLaporanObat(applied).then((r) => r.data.data),
    enabled:      true,
    staleTime:    0,
    retry:        2,
    retryDelay:   1000,
  });

  const handleTampilkan = () => setApplied({ ...filter });

  return (
    <div className="space-y-4">

      {/* ── Filter card ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-text-primary">Filter laporan</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="label">Dari tanggal</label>
              <input
                type="date" className="input"
                value={filter.tanggal_awal}
                onChange={(e) => setFilter((f) => ({ ...f, tanggal_awal: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Sampai tanggal</label>
              <input
                type="date" className="input"
                value={filter.tanggal_akhir}
                onChange={(e) => setFilter((f) => ({ ...f, tanggal_akhir: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Dokter</label>
              <select
                className="input"
                value={filter.dokter_id}
                onChange={(e) => setFilter((f) => ({ ...f, dokter_id: e.target.value }))}
              >
                <option value="">Semua dokter</option>
                {dokterList?.map((d) => (
                  <option key={d.id} value={d.id}>{d.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status kunjungan</label>
              <select
                className="input"
                value={filter.status}
                onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="">Semua status</option>
                {['menunggu', 'diperiksa', 'selesai', 'batal'].map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={handleTampilkan} className="btn-primary btn-sm">
            <Search className="w-4 h-4" /> Tampilkan laporan
          </button>
        </div>
      </div>

      {/* ── Tabs + konten ── */}
      <div className="card">
        {/* Tab switcher */}
        <div className="flex border-b border-border px-6">
          {[
            { id: 'kunjungan', label: 'Kunjungan pasien' },
            { id: 'obat',      label: 'Penggunaan obat'  },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary-dark'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ════ Tab: Kunjungan ════ */}
        {tab === 'kunjungan' && (
          <>
            {/* Ringkasan + tombol export */}
            {kjData && !kjLoading && (
              <div className="px-6 py-3 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-6 text-sm">
                  {[
                    { l: 'Total',    v: kjData.ringkasan?.total,    c: 'text-text-primary'   },
                    { l: 'Selesai',  v: kjData.ringkasan?.selesai,  c: 'text-status-success' },
                    { l: 'Menunggu', v: kjData.ringkasan?.menunggu, c: 'text-status-warning' },
                    { l: 'Batal',    v: kjData.ringkasan?.batal,    c: 'text-status-danger'  },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="text-center">
                      <p className={`text-xl font-bold ${c}`}>{v ?? 0}</p>
                      <p className="text-xs text-text-secondary">{l}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => exportKunjunganPDF(kjData.data, applied)}
                  disabled={!kjData.data?.length}
                  className="btn-outline btn-sm"
                >
                  <FileDown className="w-4 h-4" /> Export PDF
                </button>
              </div>
            )}

            {kjLoading  ? <div className="flex justify-center py-12"><Spinner /></div>
            : kjError    ? <QueryError onRetry={kjRefetch} />
            : !kjData?.data?.length
              ? <EmptyState title="Tidak ada data kunjungan" description="Tidak ada kunjungan pada periode ini. Coba ubah filter." />
              : (
                <div className="table-wrapper rounded-none border-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Tanggal</th><th>No. RM</th><th>Nama</th>
                        <th>Kelas</th><th>Dokter</th><th>Diagnosa</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kjData.data.map((k, i) => {
                        const { label, cls } = statusKunjunganLabel(k.status);
                        return (
                          <tr key={k.id}>
                            <td className="text-text-secondary">{i + 1}</td>
                            <td className="whitespace-nowrap">{formatDate(k.tanggal)}</td>
                            <td className="font-mono text-xs text-primary font-semibold">{k.no_rm}</td>
                            <td className="font-medium text-text-primary">{k.nama_pasien}</td>
                            <td className="text-text-secondary">{k.kelas || '-'}</td>
                            <td className="text-text-secondary">{k.nama_dokter || '-'}</td>
                            <td className="text-text-secondary max-w-xs truncate">{k.diagnosa || '-'}</td>
                            <td><span className={cls}>{label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </>
        )}

        {/* ════ Tab: Obat ════ */}
        {tab === 'obat' && (
          <>
            {obatData && !obatLoading && (
              <div className="px-6 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm text-text-secondary">
                  {obatData.data?.length ?? 0} jenis obat digunakan
                </p>
                <button
                  onClick={() => exportObatPDF(obatData.data, applied)}
                  disabled={!obatData.data?.length}
                  className="btn-outline btn-sm"
                >
                  <FileDown className="w-4 h-4" /> Export PDF
                </button>
              </div>
            )}

            {obatLoading  ? <div className="flex justify-center py-12"><Spinner /></div>
            : obatError    ? <QueryError onRetry={obatRefetch} />
            : !obatData?.data?.length
              ? <EmptyState title="Tidak ada data obat" description="Tidak ada penggunaan obat pada periode ini. Coba ubah filter." />
              : (
                <div className="table-wrapper rounded-none border-0">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Kode obat</th><th>Nama obat</th>
                        <th>Satuan</th><th>Total digunakan</th><th>Jumlah resep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {obatData.data.map((o, i) => (
                        <tr key={o.kode_obat}>
                          <td className="text-text-secondary">{i + 1}</td>
                          <td className="font-mono text-xs text-text-secondary">{o.kode_obat}</td>
                          <td className="font-medium text-text-primary">{o.nama_obat}</td>
                          <td className="text-text-secondary">{o.satuan}</td>
                          <td className="font-bold text-primary-dark">{o.total_digunakan}</td>
                          <td className="text-text-secondary">{o.jumlah_resep}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </>
        )}
      </div>
    </div>
  );
}
