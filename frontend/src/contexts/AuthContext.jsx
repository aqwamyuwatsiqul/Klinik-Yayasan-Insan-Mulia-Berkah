import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const Ctx = createContext(null);

/**
 * Storage helpers.
 *
 * Token disimpan di sessionStorage → otomatis hilang saat tab/browser ditutup.
 * Data user (non-sensitif) disimpan di sessionStorage juga agar konsisten.
 *
 * Catatan: setiap tab browser punya sessionStorage sendiri. Jika user
 * membuka tab baru, dia perlu login lagi. Ini perilaku yang diharapkan
 * untuk sistem klinik (keamanan lebih ketat).
 */
const storage = {
  getToken  : ()    => sessionStorage.getItem('token'),
  setToken  : (v)   => sessionStorage.setItem('token', v),
  getUser   : ()    => { try { return JSON.parse(sessionStorage.getItem('user')); } catch { return null; } },
  setUser   : (u)   => sessionStorage.setItem('user', JSON.stringify(u)),
  clear     : ()    => { sessionStorage.removeItem('token'); sessionStorage.removeItem('user'); },
};

export function AuthProvider({ children }) {
  const [user,    setUserState] = useState(() => storage.getUser());
  const [loading, setLoading  ] = useState(true);

  // Verifikasi token ke server saat pertama load
  useEffect(() => {
    const token = storage.getToken();
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then((r) => setUserState(r.data.data))
      .catch(() => {
        storage.clear();
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (creds) => {
    const r = await authAPI.login(creds);
    const { token, user: u } = r.data.data;
    storage.setToken(token);
    storage.setUser(u);
    setUserState(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    storage.clear();
    setUserState(null);
  }, []);

  // setUser yang otomatis sync ke sessionStorage
  const updateUser = useCallback((updater) => {
    setUserState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) storage.setUser(next);
      else      storage.clear();
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      setUser:    updateUser,
      loading,
      login,
      logout,
      isAdmin:    user?.role === 'admin',
      isDokter:   user?.role === 'dokter',
      isApoteker: user?.role === 'apoteker',
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
