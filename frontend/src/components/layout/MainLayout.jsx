import { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Spinner from '../common/Spinner';

/* ── Konstanta lebar sidebar ─────────────────────────────────────────────── */
const MIN_W    = 150;   // minimum (sesuai ketentuan)
const MAX_W    = 400;   // maksimum (sesuai ketentuan)
const DEF_W    = 240;   // default
const ICON_W   = 64;    // collapsed icon-only
const SNAP_W   = 120;   // jika drag lepas di sini → snap ke ICON_W
const STOR_KEY = 'sb_w';

function readSaved() {
  const v = parseInt(sessionStorage.getItem(STOR_KEY));
  if (v === ICON_W)           return ICON_W;
  if (v >= MIN_W && v <= MAX_W) return v;
  return DEF_W;
}

export default function MainLayout() {
  const { user, loading } = useAuth();

  /* ── State ──────────────────────────────────────────────────────────────── */
  const [open,      setOpen     ] = useState(() => window.innerWidth >= 1024);
  const [sidebarW,  setSidebarW ] = useState(readSaved);

  /* ── Refs ───────────────────────────────────────────────────────────────── */
  const wrapRef    = useRef(null);   // <div> pembungkus grid
  const dragging   = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(0);
  const animating  = useRef(false);  // flag: sedang dalam CSS transition

  /* ── Terapkan lebar ke CSS grid column ──────────────────────────────────── */
  const applyGrid = useCallback((w, withTransition = false) => {
    const el = wrapRef.current;
    if (!el) return;
    if (withTransition) {
      animating.current = true;
      el.style.transition = 'grid-template-columns 220ms ease';
      const done = () => { animating.current = false; el.style.transition = ''; };
      el.addEventListener('transitionend', done, { once: true });
    } else {
      el.style.transition = 'none';
    }
    el.style.gridTemplateColumns = `${w}px 1fr`;
  }, []);

  /* ── Sinkron grid saat open/sidebarW berubah ────────────────────────────── */
  useEffect(() => {
    if (!wrapRef.current) return;
    if (!open) {
      applyGrid(0, true);
      wrapRef.current.style.gridTemplateColumns = '0px 1fr';
    } else {
      applyGrid(sidebarW, true);
    }
  }, [open, sidebarW, applyGrid]);

  /* ── Tutup otomatis saat resize ke mobile ───────────────────────────────── */
  useEffect(() => {
    const handler = () => setOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ── Drag: mousedown pada resizer ───────────────────────────────────────── */
  const onResizerMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();

    dragging.current = true;
    startX.current   = e.clientX;
    startW.current   = sidebarW === ICON_W ? MIN_W : sidebarW;

    /* Efek visual sesuai ketentuan */
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    /* Matikan transisi selama drag */
    if (wrapRef.current) wrapRef.current.style.transition = 'none';
  }, [sidebarW]);

  /* ── Drag: mousemove + mouseup global ───────────────────────────────────── */
  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;

      const delta = e.clientX - startX.current;
      const newW  = Math.max(MIN_W, Math.min(MAX_W, startW.current + delta));

      /* Update grid langsung via DOM — zero React re-render → 60 fps */
      if (wrapRef.current)
        wrapRef.current.style.gridTemplateColumns = `${newW}px 1fr`;
    };

    const onUp = (e) => {
      if (!dragging.current) return;
      dragging.current = false;

      /* Bersihkan efek visual */
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';

      /* Baca lebar final dari DOM */
      const cols = wrapRef.current?.style.gridTemplateColumns || '';
      const match = cols.match(/^(\d+(?:\.\d+)?)px/);
      const finalW = match ? parseFloat(match[1]) : startW.current;

      let nextW;
      if (finalW < SNAP_W) {
        nextW = ICON_W;                         // snap collapse
      } else {
        nextW = Math.max(MIN_W, Math.min(MAX_W, finalW));
      }

      /* Commit ke React state + storage */
      setSidebarW(nextW);
      sessionStorage.setItem(STOR_KEY, nextW);

      /* Update grid dengan nilai final (tanpa transisi) */
      if (wrapRef.current)
        wrapRef.current.style.gridTemplateColumns = `${open ? nextW : 0}px 1fr`;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [open]);

  /* ── Loading state ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-text-secondary">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  /* ── Layout utama — GRID bukan FLEX ─────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-surface-page">

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/*
        Grid container: dua kolom
        - col 1: sidebar (lebar dikendalikan JS via gridTemplateColumns)
        - col 2: konten utama (1fr — otomatis isi sisa ruang)
      */}
      <div
        ref={wrapRef}
        style={{
          display             : 'grid',
          gridTemplateColumns : `${open ? sidebarW : 0}px 1fr`,
          minHeight           : '100vh',
        }}
      >
        {/* ── Kolom 1: Sidebar ── */}
        <div className="relative overflow-hidden" style={{ contain: 'strict' }}>
          <Sidebar
            open={open}
            sidebarW={sidebarW}
            onClose={() => setOpen(false)}
          />

          {/* Resizer — tepi kanan sidebar */}
          {open && (
            <div
              onMouseDown={onResizerMouseDown}
              onDoubleClick={() => {
                const next = sidebarW === ICON_W ? DEF_W : ICON_W;
                setSidebarW(next);
                sessionStorage.setItem(STOR_KEY, next);
              }}
              title="Seret untuk ubah lebar  •  Klik dua kali untuk collapse"
              aria-hidden="true"
              style={{
                position : 'absolute',
                top      : 0,
                right    : 0,
                width    : '6px',
                height   : '100%',
                zIndex   : 40,
                cursor   : 'col-resize',
              }}
              className="group select-none"
            >
              {/* Garis visual */}
              <div
                className="absolute inset-y-0 right-0 w-px
                           bg-border group-hover:bg-primary group-hover:w-[2px]
                           transition-all duration-100"
              />
              {/* Tiga titik di tengah */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                              flex flex-col gap-[3px] opacity-0 group-hover:opacity-100
                              transition-opacity duration-100 pointer-events-none">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-[3px] h-[3px] rounded-full bg-primary" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Kolom 2: Konten utama ── */}
        <div className="flex flex-col min-w-0 min-h-screen">
          <Topbar
            onToggleSidebar={() => setOpen((v) => !v)}
            sidebarOpen={open}
          />
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
