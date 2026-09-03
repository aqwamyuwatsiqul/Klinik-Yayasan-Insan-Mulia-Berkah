import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifikasi } from '../../hooks/useNotifikasi';
import {
  PanelLeftClose, PanelLeftOpen,
  UserCircle, Settings, LogOut, ChevronDown,
  Bell, ClipboardList, FlaskConical, CheckCheck,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/id';
dayjs.extend(relativeTime);
dayjs.locale('id');

const titles = {
  '/dashboard':      'Dashboard',
  '/pasien':         'Data pasien',
  '/dokter':         'Data dokter',
  '/kunjungan':      'Manajemen kunjungan',
  '/antrian':        'Antrian pasien',
  '/antrian-resep':  'Antrian resep',
  '/pasien-riwayat': 'Riwayat pasien',
  '/users':          'Manajemen user',
  '/obat':           'Data obat',
  '/laporan':        'Laporan',
  '/profil':         'Profil saya',
  '/pengaturan':     'Pengaturan akun',
};

const roleLabelMap = {
  admin    : 'Administrator',
  dokter   : 'Dokter',
  apoteker : 'Apoteker',
};

// ── Komponen Notifikasi Bell ───────────────────────────────────────────────
function NotifikasiDropdown() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { items, count } = useNotifikasi();
  const [open, setOpen]  = useState(false);
  const ref = useRef(null);

  // Tutup saat klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const labelRole = {
    dokter   : 'pasien menunggu diperiksa',
    apoteker : 'resep menunggu diserahkan',
    admin    : 'kunjungan menunggu',
  }[user?.role] || 'notifikasi';

  const Icon = user?.role === 'apoteker' ? FlaskConical : ClipboardList;

  const handleItemClick = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${count} ${labelRole}`}
        className="relative w-8 h-8 flex items-center justify-center rounded-[8px]
                   text-text-secondary hover:bg-primary-tint hover:text-primary
                   transition-colors"
      >
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="
            absolute -top-0.5 -right-0.5
            min-w-[16px] h-4 px-1
            bg-status-danger text-white text-[10px] font-bold
            rounded-full flex items-center justify-center leading-none
          ">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="
          absolute right-0 top-full mt-2 w-80 bg-white rounded-[12px]
          border border-border shadow-lg z-50 overflow-hidden
        ">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Notifikasi</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {count > 0
                  ? `${count} ${labelRole}`
                  : `Tidak ada ${labelRole}`}
              </p>
            </div>
            {count > 0 && (
              <span className="badge badge-red">{count} baru</span>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-10 h-10 rounded-[10px] bg-primary-tint flex items-center justify-center">
                  <CheckCheck className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-text-secondary">Semua sudah ditangani</p>
              </div>
            ) : (
              items.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleItemClick(notif.to)}
                  className="w-full flex items-start gap-3 px-4 py-3
                             hover:bg-primary-tint/50 transition-colors text-left"
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-[8px] bg-status-warning-bg flex items-center
                                  justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-status-warning" />
                  </div>
                  {/* Teks */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">
                      {notif.title}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{notif.desc}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      {notif.time ? dayjs(notif.time).fromNow() : ''}
                    </p>
                  </div>
                  {/* Dot baru */}
                  <div className="w-2 h-2 rounded-full bg-status-danger flex-shrink-0 mt-1.5" />
                </button>
              ))
            )}
          </div>

          {/* Footer — link ke halaman antrian */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border">
              <button
                onClick={() => handleItemClick(items[0]?.to)}
                className="text-xs font-semibold text-primary hover:text-primary-dark
                           transition-colors w-full text-center"
              >
                Lihat semua →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Profile Dropdown ───────────────────────────────────────────────────────
function ProfileDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const navigate        = useNavigate();
  const ref             = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const go = (path) => { setOpen(false); navigate(path); };

  // Avatar — foto atau inisial
  const avatarUrl = user?.foto_profil
    ? `/uploads/profil/${user.foto_profil}`
    : null;

  const AvatarSm = () => avatarUrl ? (
    <img
      src={avatarUrl}
      alt={user?.nama}
      className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-border"
    />
  ) : (
    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center
                    text-white font-semibold text-xs flex-shrink-0">
      {user?.nama?.charAt(0).toUpperCase()}
    </div>
  );

  const AvatarLg = () => avatarUrl ? (
    <img
      src={avatarUrl}
      alt={user?.nama}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-primary/20"
    />
  ) : (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center
                    text-white font-bold text-sm flex-shrink-0">
      {user?.nama?.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-[8px]
                   hover:bg-primary-tint transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Menu profil"
      >
        <AvatarSm />
        <div className="hidden sm:block text-left min-w-0">
          <p className="text-sm font-semibold text-text-primary leading-tight truncate max-w-[120px]">
            {user?.nama}
          </p>
          <p className="text-[11px] text-text-secondary leading-tight capitalize">
            {roleLabelMap[user?.role] || user?.role}
          </p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform flex-shrink-0
                                ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[12px]
                        border border-border shadow-lg z-50 overflow-hidden">
          {/* Info user */}
          <div className="px-4 py-3 border-b border-border bg-primary-tint/40">
            <div className="flex items-center gap-3">
              <AvatarLg />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary-dark truncate">{user?.nama}</p>
                <p className="text-xs text-text-secondary">{user?.email || `@${user?.username}`}</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px]
                                 font-semibold bg-primary text-white capitalize">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button role="menuitem" onClick={() => go('/profil')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary
                         hover:bg-primary-tint hover:text-primary-dark transition-colors">
              <UserCircle className="w-4 h-4 text-text-secondary flex-shrink-0" />
              Profil saya
            </button>
            <button role="menuitem" onClick={() => go('/pengaturan')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary
                         hover:bg-primary-tint hover:text-primary-dark transition-colors">
              <Settings className="w-4 h-4 text-text-secondary flex-shrink-0" />
              Pengaturan akun
            </button>
          </div>

          <div className="border-t border-border py-1">
            <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-status-danger
                         hover:bg-status-danger-bg transition-colors">
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Topbar utama ───────────────────────────────────────────────────────────
export default function Topbar({ onToggleSidebar, sidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const { pathname }      = useLocation();
  const title             = titles[pathname] || 'Klinik Yayasan Insan Mulia Berkah';

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  return (
    <header className="h-14 bg-white border-b border-border flex items-center
                       justify-between px-4 flex-shrink-0 z-10">

      {/* ── Kiri: toggle + judul halaman ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Sembunyikan sidebar' : 'Tampilkan sidebar'}
          className="w-8 h-8 flex items-center justify-center rounded-[8px]
                     text-text-secondary hover:bg-primary-tint hover:text-primary
                     transition-colors flex-shrink-0"
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-5 h-5" />
            : <PanelLeftOpen  className="w-5 h-5" />}
        </button>

        <div className="w-px h-5 bg-border" />

        <div>
          <h1 className="text-sm font-semibold text-text-primary leading-tight capitalize">
            {title}
          </h1>
          <p className="text-[11px] text-text-secondary leading-tight">
            {dayjs().format('dddd, DD MMMM YYYY')}
          </p>
        </div>
      </div>

      {/* ── Kanan: notifikasi + profil ── */}
      <div className="flex items-center gap-2">
        <NotifikasiDropdown />
        <div className="w-px h-5 bg-border" />
        <ProfileDropdown user={user} onLogout={handleLogout} />
      </div>
    </header>
  );
}
