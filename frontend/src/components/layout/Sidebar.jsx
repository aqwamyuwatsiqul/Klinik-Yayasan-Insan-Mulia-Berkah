import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, UserCog, Stethoscope, ClipboardList,
  FlaskConical, Package, FileBarChart, History,
} from 'lucide-react';

const ICON_W = 64;

const NAV = {
  admin: [
    { to: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/pasien',    Icon: Users,            label: 'Data pasien'    },
    { to: '/dokter',    Icon: Stethoscope,      label: 'Data dokter'    },
    { to: '/kunjungan', Icon: ClipboardList,    label: 'Kunjungan'      },
    { to: '/users',     Icon: UserCog,          label: 'Manajemen user' },
    { to: '/laporan',   Icon: FileBarChart,     label: 'Laporan'        },
  ],
  dokter: [
    { to: '/dashboard',      Icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/antrian',        Icon: ClipboardList,   label: 'Antrian pasien' },
    { to: '/pasien-riwayat', Icon: History,         label: 'Riwayat pasien' },
    { to: '/pasien',         Icon: Users,           label: 'Data pasien'    },
  ],
  apoteker: [
    { to: '/dashboard',     Icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/antrian-resep', Icon: FlaskConical,    label: 'Antrian resep' },
    { to: '/obat',          Icon: Package,         label: 'Data obat'     },
  ],
};

function Avatar({ user }) {
  if (user?.foto_profil) {
    return (
      <img
        src={`/uploads/profil/${user.foto_profil}`}
        alt={user.nama}
        className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center
                    text-white font-semibold text-sm flex-shrink-0">
      {user?.nama?.charAt(0).toUpperCase()}
    </div>
  );
}

/**
 * Sidebar murni — hanya tampilan.
 * Semua logika drag & lebar dikelola oleh MainLayout.
 *
 * Props:
 *   open      — apakah sidebar ditampilkan
 *   sidebarW  — lebar saat ini (px), dipakai untuk collapsed detection
 *   onClose   — dipanggil saat menu diklik di mobile
 */
export default function Sidebar({ open, sidebarW, onClose }) {
  const { user } = useAuth();
  const links    = NAV[user?.role] || [];

  /* Collapsed = lebar <= ICON_W */
  const collapsed = !open || sidebarW <= ICON_W;

  return (
    <aside
      className="flex flex-col bg-white border-r border-border h-full w-full overflow-hidden"
    >
      {/* ── Logo ── */}
      <div
        className={`flex items-center border-b border-border flex-shrink-0
                    ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4'}`}
      >
        <img
          src="/logo.png"
          alt="Logo Yayasan"
          className="w-9 h-9 object-contain rounded-[8px] flex-shrink-0"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary-dark leading-tight whitespace-nowrap">
              Yayasan Insan Mulia Berkah
            </p>
            <p className="text-[11px] text-text-secondary whitespace-nowrap">Sistem Klinik</p>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden
                    ${collapsed ? 'px-2' : 'px-3'}`}
        aria-label="Menu navigasi"
      >
        {links.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={() => { if (window.innerWidth < 1024) onClose?.(); }}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center !px-2' : ''}`
            }
          >
            <Icon style={{ width: 17, height: 17 }} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── User info ── */}
      <div
        className={`border-t border-border flex-shrink-0
                    ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}
      >
        {collapsed ? (
          <div className="flex justify-center" title={user?.nama}>
            <Avatar user={user} />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] bg-primary-tint">
            <Avatar user={user} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{user?.nama}</p>
              <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
