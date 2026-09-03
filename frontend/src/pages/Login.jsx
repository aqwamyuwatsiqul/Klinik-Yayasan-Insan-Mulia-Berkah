import { useState, useEffect } from 'react';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Spinner from '../components/common/Spinner';
import { getErrorMessage } from '../utils/helpers';

const fiturUtama = [
  { label: 'Manajemen data pasien & rekam medis'        },
  { label: 'Antrian kunjungan real-time'                },
  { label: 'Sistem resep & stok obat terintegrasi'      },
  { label: 'Laporan kunjungan & penggunaan obat'        },
  { label: 'Akses multi-role: admin, dokter, apoteker'  },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();
  const sessionExpired = searchParams.get('session') === 'expired';

  if (user) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data);
      toast.success('Login berhasil');
      // Kembali ke halaman sebelum sesi berakhir, jika ada
      const redirectTo = sessionStorage.getItem('redirect_after_login') || '/dashboard';
      sessionStorage.removeItem('redirect_after_login');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ═══════════════════════════════════════
          SISI KIRI — Hero / Branding Area
      ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-between p-12 relative overflow-hidden">
        {/* Dekorasi lingkaran background */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white opacity-5 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary-dark opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 -right-16 w-48 h-48 rounded-full bg-primary-light opacity-10 pointer-events-none" />

        {/* Logo asli Yayasan — atas */}
        <div className="relative z-10">
          <img
            src="/logo.png"
            alt="Logo Yayasan Insan Mulia Berkah"
            className="w-40 h-40 object-contain drop-shadow-lg"
          />
        </div>

        {/* Teks tengah */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-3">
            Sistem Informasi Klinik
          </p>
          <h1 className="text-white text-4xl font-bold leading-snug mb-4">
            Pelayanan kesehatan<br />yang lebih baik<br />dimulai dari sini.
          </h1>
          <p className="text-white/70 text-sm leading-relaxed mb-10 max-w-sm">
            Platform terintegrasi untuk mengelola data pasien, kunjungan,
            rekam medis, dan farmasi dalam satu sistem yang mudah digunakan.
          </p>

          {/* Fitur utama */}
          <ul className="space-y-3">
            {fiturUtama.map(({ label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="text-white/80 text-sm">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tagline bawah */}
        <div className="relative z-10">
          <div className="h-px bg-white/20 mb-5" />
          <p className="text-white/60 text-xs italic">
            "Melayani dengan hati, memberi dengan ikhlas"
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SISI KANAN — Action Area (Form Login)
      ═══════════════════════════════════════ */}
      <div className="flex-1 lg:w-1/2 bg-surface-page flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Logo untuk mobile (hanya tampil saat layar kecil) */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img
              src="/logo.png"
              alt="Logo Yayasan Insan Mulia Berkah"
              className="w-12 h-12 object-contain"
            />
            <div>
              <p className="font-bold text-primary-dark text-sm leading-tight">
                Yayasan Insan Mulia Berkah
              </p>
              <p className="text-xs text-text-secondary">Sistem Informasi Klinik</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary-dark">Selamat datang</h2>
            <p className="text-text-secondary text-sm mt-1">
              Masuk untuk mengakses sistem klinik
            </p>
          </div>

          {/* Banner sesi berakhir */}
          {sessionExpired && (
            <div className="mb-5 px-4 py-3 rounded-[8px] bg-status-warning-bg border border-yellow-300 text-sm text-amber-800 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <span>Sesi Anda telah berakhir. Silakan masuk kembali.</span>
            </div>
          )}

          {/* Form login */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

            {/* Username / Email */}
            <div>
              <label className="label" htmlFor="username">Email atau username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  placeholder="Masukkan email atau username"
                  className={`input pl-9 ${errors.username ? 'input-error' : ''}`}
                  {...register('username', { required: 'Email atau username wajib diisi' })}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-status-danger mt-1">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password"
                  className={`input pl-9 pr-10 ${errors.password ? 'input-error' : ''}`}
                  {...register('password', { required: 'Password wajib diisi' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-status-danger mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Tombol masuk */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-base"
            >
              {loading ? (
                <><Spinner size="sm" /> Memproses...</>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-text-secondary mt-10">
            © {new Date().getFullYear()} Yayasan Insan Mulia Berkah
          </p>
        </div>
      </div>

    </div>
  );
}
