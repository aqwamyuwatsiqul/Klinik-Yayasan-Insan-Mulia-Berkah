import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { pembayaranAPI } from '../../api';
import { formatDateTime, formatCurrency } from '../../utils/helpers';
import EmptyState from '../../components/common/EmptyState';
import Spinner from '../../components/common/Spinner';
import { RefreshCw, CreditCard } from 'lucide-react';
import dayjs from 'dayjs';

export default function AntrianKasir() {
  const navigate = useNavigate();
  const tanggal  = dayjs().format('YYYY-MM-DD');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['kasir-antrian', tanggal],
    queryFn: () => pembayaranAPI.getAntrian({ tanggal }).then(r => r.data.data),
    refetchInterval: 30_000,
  });

  const list = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-primary-dark">Antrian kasir</h2>
          <p className="text-sm text-text-secondary">{dayjs(tanggal).format('dddd, DD MMMM YYYY')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-status-danger">{list.length}</p>
            <p className="text-xs text-text-secondary">Menunggu bayar</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-secondary btn-sm"
            title="Perbarui antrian"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !list.length ? (
        <EmptyState
          title="Tidak ada antrian pembayaran"
          description="Kunjungan yang sudah selesai diperiksa akan muncul di sini."
        />
      ) : (
        <div className="card">
          <div className="table-wrapper rounded-none border-0">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. RM</th>
                  <th>Nama Pasien</th>
                  <th>Jenis</th>
                  <th>Dokter</th>
                  <th>Waktu Daftar</th>
                  <th>Total Tagihan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {list.map((k) => (
                  <tr key={k.kunjungan_id}>
                    <td className="font-mono text-xs text-primary font-semibold">{k.no_rm}</td>
                    <td className="font-medium text-text-primary">{k.nama_pasien}</td>
                    <td>
                      <span className={`badge ${k.jenis_pasien === 'siswa' ? 'badge-blue' : 'badge-gray'}`}>
                        {k.jenis_pasien === 'siswa' ? 'Siswa' : 'Umum'}
                      </span>
                    </td>
                    <td className="text-text-secondary">{k.nama_dokter || '—'}</td>
                    <td className="text-text-secondary text-xs">{formatDateTime(k.waktu_daftar)}</td>
                    <td className="font-semibold text-text-primary">
                      {k.total_tagihan ? formatCurrency(k.total_tagihan) : <span className="text-text-secondary text-xs">Belum dihitung</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => navigate(`/kasir/proses/${k.kunjungan_id}`)}
                        className="btn-primary btn-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Proses
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
