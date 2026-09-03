import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { pasienAPI, rekamMedisAPI } from '../../api';
import { formatDate, hitungUmur } from '../../utils/helpers';
import SearchInput from '../../components/common/SearchInput';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import { ChevronDown, ChevronUp, User } from 'lucide-react';

function RMCard({ rm }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-[12px] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-tint/50 text-left transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-text-primary">{formatDate(rm.tanggal_periksa)}</p>
          <p className="text-xs text-text-secondary">
            {rm.nama_dokter} — {rm.diagnosa || 'Tanpa diagnosa'}
          </p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-text-secondary flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-border bg-primary-tint/30 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            ['Keluhan',     rm.keluhan    ],
            ['Pemeriksaan', rm.pemeriksaan],
            ['Diagnosa',    rm.diagnosa   ],
            ['Terapi',      rm.terapi     ],
            ['Catatan',     rm.catatan    ],
            ['Vital sign',  `TD: ${rm.tekanan_darah || '-'} | Suhu: ${rm.suhu || '-'}°C | BB: ${rm.berat_badan || '-'} kg | TB: ${rm.tinggi_badan || '-'} cm`],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-text-secondary font-medium mb-0.5">{k}</p>
                <p className="text-text-primary">{v}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function RiwayatPasien() {
  const [search,   setSearch  ] = useState('');
  const [page,     setPage    ] = useState(1);
  const [selected, setSelected] = useState(null);
  const [rmPage,   setRmPage  ] = useState(1);

  const { data: pasienData, isLoading } = useQuery({
    queryKey: ['pasien', search, page],
    queryFn: () => pasienAPI.getAll({ search, page, limit: 15 }).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const { data: rmData, isLoading: rmLoading } = useQuery({
    queryKey: ['rm-pasien', selected?.id, rmPage],
    queryFn: () =>
      rekamMedisAPI.getByPasien(selected.id, { page: rmPage, limit: 10 }).then((r) => r.data.data),
    enabled: !!selected,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Daftar pasien ── */}
      <div className="lg:col-span-2 card">
        <div className="card-header">
          <h2 className="font-semibold text-text-primary">Cari pasien</h2>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Cari nama atau No. RM..."
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !pasienData?.data?.length ? (
          <EmptyState title="Pasien tidak ditemukan" description="Coba kata kunci lain." />
        ) : (
          <>
            <div className="divide-y divide-border">
              {pasienData.data.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelected(p); setRmPage(1); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-tint ${
                    selected?.id === p.id
                      ? 'bg-primary-tint border-r-2 border-primary'
                      : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.nama}</p>
                    <p className="text-xs text-text-secondary">
                      {p.no_rm} | {hitungUmur(p.tanggal_lahir)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <Pagination pagination={pasienData.pagination} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* ── Riwayat rekam medis ── */}
      <div className="lg:col-span-3">
        {!selected ? (
          <div className="card">
            <EmptyState
              title="Pilih pasien terlebih dahulu"
              description="Klik nama pasien di sebelah kiri untuk melihat riwayat rekam medisnya."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info pasien */}
            <div className="card p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[12px] bg-primary-tint flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 flex-1 text-sm">
                  {[
                    ['No. RM',       <span className="font-mono font-bold text-primary">{selected.no_rm}</span>],
                    ['Nama',         selected.nama],
                    ['Usia',         hitungUmur(selected.tanggal_lahir)],
                    ['Jenis kelamin', selected.jenis_kelamin || '-'],
                    ['Kelas',        selected.kelas || '-'],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-text-secondary">{k}</p>
                      <p className="font-medium text-text-primary">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rekam medis */}
            <div className="card">
              <div className="card-header">
                <h3 className="font-semibold text-text-primary">Riwayat rekam medis</h3>
                <span className="text-xs text-text-secondary badge badge-gray">
                  {rmData?.pagination?.total ?? 0} kunjungan
                </span>
              </div>
              <div className="p-4 space-y-3">
                {rmLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : !rmData?.data?.length ? (
                  <EmptyState
                    title="Belum ada rekam medis"
                    description="Pasien ini belum pernah diperiksa."
                  />
                ) : (
                  <>
                    {rmData.data.map((rm) => <RMCard key={rm.id} rm={rm} />)}
                    <Pagination pagination={rmData.pagination} onPageChange={setRmPage} />
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
