import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import { ShieldOff } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Spinner from './components/common/Spinner';

// ── Layout (eager — dibutuhkan segera setelah login) ──────────────────────
import MainLayout from './components/layout/MainLayout';

// ── Halaman kritis: load segera (tidak lazy) ──────────────────────────────
// Login & Dashboard adalah halaman pertama yang dilihat user.
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import DisplayTV  from './pages/DisplayTV';

// ── Lazy load semua halaman lainnya ───────────────────────────────────────
// Setiap halaman ini menjadi chunk JS terpisah.
// Browser hanya mendownload chunk yang dibutuhkan saat user mengunjungi route tsb.
const Profil        = lazy(() => import('./pages/Profil'));
const Pengaturan    = lazy(() => import('./pages/Pengaturan'));

// Owner — kelola master data & laporan
const Dokter        = lazy(() => import('./pages/admin/Dokter'));
const Users         = lazy(() => import('./pages/admin/Users'));
const Laporan       = lazy(() => import('./pages/admin/Laporan')); // berat karena jsPDF
const TarifLayanan     = lazy(() => import('./pages/owner/TarifLayanan'));
const RiwayatTransaksi = lazy(() => import('./pages/owner/RiwayatTransaksi'));
const AuditLog         = lazy(() => import('./pages/owner/AuditLog'));

// Admin — operasional harian
const Pasien        = lazy(() => import('./pages/admin/Pasien'));
const Kunjungan     = lazy(() => import('./pages/admin/Kunjungan'));

// Dokter
const AntrianDokter = lazy(() => import('./pages/dokter/Antrian'));
const RiwayatPasien = lazy(() => import('./pages/dokter/RiwayatPasien'));

// Apoteker
const AntrianResep  = lazy(() => import('./pages/apoteker/AntrianResep'));
const Obat          = lazy(() => import('./pages/apoteker/Obat'));

// Kasir
const AntrianKasir  = lazy(() => import('./pages/kasir/AntrianKasir'));
const ProsesBayar   = lazy(() => import('./pages/kasir/ProsesBayar'));

// ── Fallback saat lazy chunk sedang loading ────────────────────────────────
function PageLoader() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh] gap-3"
      aria-label="Memuat halaman..."
      role="status"
    >
      <Spinner size="lg" />
      <span className="text-sm text-text-secondary">Memuat...</span>
    </div>
  );
}

// ── QueryClient dengan global error handler ────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries   : { retry: 1, staleTime: 30_000, throwOnError: false },
    mutations : { throwOnError: false },
  },
  queryCache: new QueryCache({
    onError: (err, query) => {
      if (err?.response?.status === 401) return;
      if (query.meta?.silent) return;
      toast.error('Gagal memuat data. Silakan refresh halaman.');
    },
  }),
  mutationCache: new MutationCache({
    onError: (err) => {
      if (err?.response?.status === 401) return;
      if (import.meta.env.DEV) {
        console.warn('[MutationCache] Unhandled mutation error:', err?.message);
      }
    },
  }),
});

// ── RoleGuard — halaman 403 informatif ────────────────────────────────────
function RoleGuard({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4"
        role="alert"
        aria-live="polite"
      >
        <div className="w-16 h-16 rounded-[16px] bg-status-danger-bg flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-status-danger" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Akses ditolak</h2>
          <p className="text-sm text-text-secondary mt-1 max-w-sm">
            Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini hanya tersedia untuk:{' '}
            <span className="font-semibold text-text-primary">
              {roles.map((r) =>
                ({ admin: 'Admin', dokter: 'Dokter', apoteker: 'Apoteker', owner: 'Owner', kasir: 'Kasir' }[r] || r)
              ).join(', ')}
            </span>.
          </p>
        </div>
        <Link to="/dashboard" className="btn-outline btn-sm mt-2">
          Kembali ke dashboard
        </Link>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {/*
            Suspense membungkus seluruh Routes agar lazy chunks
            bisa menampilkan PageLoader saat dimuat.
          */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/tv"    element={<DisplayTV />} />

              {/* Protected */}
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"  element={<Dashboard />} />
                <Route path="/profil"     element={<Profil />} />
                <Route path="/pengaturan" element={<Pengaturan />} />

                {/* Semua role authenticated */}
                <Route path="/pasien" element={
                  <RoleGuard roles={['admin', 'dokter', 'apoteker', 'owner']}>
                    <Pasien />
                  </RoleGuard>
                } />

                {/* Owner — master data & laporan */}
                <Route path="/dokter"    element={<RoleGuard roles={['owner']}><Dokter /></RoleGuard>} />
                <Route path="/users"     element={<RoleGuard roles={['owner']}><Users /></RoleGuard>} />
                <Route path="/laporan"   element={<RoleGuard roles={['admin', 'owner']}><Laporan /></RoleGuard>} />

                {/* Admin — operasional harian */}
                <Route path="/kunjungan" element={<RoleGuard roles={['admin']}><Kunjungan /></RoleGuard>} />

                {/* Dokter */}
                <Route path="/antrian"        element={<RoleGuard roles={['dokter', 'owner']}><AntrianDokter /></RoleGuard>} />
                <Route path="/pasien-riwayat" element={<RoleGuard roles={['dokter', 'owner']}><RiwayatPasien /></RoleGuard>} />

                {/* Apoteker */}
                <Route path="/antrian-resep" element={<RoleGuard roles={['apoteker', 'admin']}><AntrianResep /></RoleGuard>} />
                <Route path="/obat"          element={<RoleGuard roles={['apoteker', 'admin']}><Obat /></RoleGuard>} />

                {/* Owner — master data & laporan */}
                <Route path="/tarif"              element={<RoleGuard roles={['owner','admin']}><TarifLayanan /></RoleGuard>} />
                <Route path="/riwayat-transaksi"  element={<RoleGuard roles={['owner','admin']}><RiwayatTransaksi /></RoleGuard>} />
                <Route path="/audit-log"          element={<RoleGuard roles={['owner']}><AuditLog /></RoleGuard>} />

                {/* Kasir */}
                <Route path="/kasir/antrian"      element={<RoleGuard roles={['kasir','admin','owner']}><AntrianKasir /></RoleGuard>} />
                <Route path="/kasir/proses/:kunjunganId" element={<RoleGuard roles={['kasir','admin']}><ProsesBayar /></RoleGuard>} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            duration : 3500,
            style    : { fontSize: '14px', borderRadius: '10px', maxWidth: '380px' },
            success  : { iconTheme: { primary: '#2E7D32', secondary: '#fff' } },
            error    : { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
