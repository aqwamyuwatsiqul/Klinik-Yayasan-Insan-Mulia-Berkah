import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { authAPI } from '../api';
import { getErrorMessage, roleLabel } from '../utils/helpers';
import { UserCircle, Mail, ShieldCheck, BadgeCheck, Camera, Loader2 } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import useAuthedImage, { invalidateAuthedImage } from '../hooks/useAuthedImage';

// ── Avatar dengan tombol upload ──────────────────────────────────────────
function AvatarUpload({ user, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview  ] = useState(null);
  const inputRef = useRef(null);

  const persistedUrl = useAuthedImage(
    user?.foto_profil ? `/uploads/profil/${user.foto_profil}` : null,
  );
  const avatarUrl = preview || persistedUrl;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview lokal sebelum upload
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Validasi sisi klien
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Format tidak didukung. Gunakan JPG, PNG, atau WebP.');
      setPreview(null);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2 MB.');
      setPreview(null);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('foto', file);
      const res     = await authAPI.uploadFotoProfil(form);
      const updated = res.data.data;
      // Hapus cache blob lama sebelum update context — hook akan fetch ulang
      // dengan path baru (safeName berubah tiap upload, tapi tetap invalidasi
      // path lama agar tidak ada entry orphan di cache)
      if (user?.foto_profil) {
        invalidateAuthedImage(`/uploads/profil/${user.foto_profil}`);
      }
      // Reset preview — dari sini avatarUrl akan pakai URL server yang baru
      // (bukan object URL lokal yang akan expired setelah di-revoke)
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      onUploaded(updated);
      toast.success('Foto profil berhasil diperbarui');
    } catch (err) {
      toast.error(getErrorMessage(err));
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    } finally {
      setUploading(false);
      // Reset input agar file yang sama bisa dipilih lagi
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="relative w-20 h-20 flex-shrink-0">
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user?.nama}
          className="w-20 h-20 rounded-full object-cover border-2 border-primary/20 shadow-sm"
        />
      ) : (
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center
                        text-white font-bold text-3xl select-none border-2 border-primary/20">
          {user?.nama?.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Overlay tombol kamera */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Ganti foto profil"
        className="
          absolute inset-0 rounded-full
          bg-black/0 hover:bg-black/40
          flex items-center justify-center
          transition-colors group
        "
      >
        {uploading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </button>

      {/* Input file tersembunyi */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {/* Badge kamera kecil di pojok */}
      {!uploading && (
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full
                        flex items-center justify-center border-2 border-white shadow">
          <Camera className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

// ── Halaman Profil ───────────────────────────────────────────────────────
export default function Profil() {
  const { user, setUser } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [saving,   setSaving  ] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { nama: user?.nama || '', email: user?.email || '', username: user?.username || '' },
  });

  useEffect(() => {
    reset({ nama: user?.nama || '', email: user?.email || '', username: user?.username || '' });
  }, [user, reset]);

  // Dipanggil setelah foto berhasil diupload
  const handleFotoUploaded = (updated) => {
    const merged = { ...user, ...updated };
    setUser(merged);
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res     = await authAPI.updateProfile(data);
      const updated = res.data.data;
      const merged  = { ...user, ...updated };
      setUser(merged);
      reset({ nama: merged.nama || '', email: merged.email || '', username: merged.username || '' });
      toast.success('Profil berhasil diperbarui');
      setEditMode(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleBatal = () => {
    setEditMode(false);
    reset({ nama: user?.nama || '', email: user?.email || '', username: user?.username || '' });
  };

  const infoItems = [
    { icon: UserCircle,  label: 'Nama lengkap', value: user?.nama             },
    { icon: Mail,        label: 'Email',         value: user?.email    || '—'  },
    { icon: ShieldCheck, label: 'Username',      value: `@${user?.username}`   },
    { icon: BadgeCheck,  label: 'Role',          value: roleLabel(user?.role)  },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Header: avatar + nama ── */}
      <div className="card p-6">
        <div className="flex items-center gap-5">
          <AvatarUpload user={user} onUploaded={handleFotoUploaded} />
          <div>
            <h2 className="text-lg font-bold text-primary-dark">{user?.nama}</h2>
            <p className="text-sm text-text-secondary capitalize">{roleLabel(user?.role)}</p>
            <p className="text-xs text-text-secondary mt-0.5">{user?.email || '—'}</p>
            <p className="text-[11px] text-text-secondary mt-1 italic">
              Klik foto untuk mengganti • JPG, PNG, WebP maks 2 MB
            </p>
          </div>
        </div>
      </div>

      {/* ── Informasi / Form edit ── */}
      <div className="card">
        <div className="card-header">
          <h3 className="font-semibold text-text-primary">Informasi akun</h3>
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="btn-outline btn-sm">
              Edit profil
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-4">
            <div>
              <label className="label" htmlFor="profil-nama">Nama lengkap *</label>
              <input
                id="profil-nama"
                className={`input ${errors.nama ? 'input-error' : ''}`}
                {...register('nama', {
                  required: 'Nama wajib diisi',
                  minLength: { value: 2, message: 'Minimal 2 karakter' },
                })}
              />
              {errors.nama && (
                <p className="text-xs text-status-danger mt-1">{errors.nama.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="profil-username">
                Username
                <span className="ml-1 text-text-secondary font-normal">(huruf, angka, underscore)</span>
              </label>
              <input
                id="profil-username"
                className={`input font-mono ${errors.username ? 'input-error' : ''}`}
                placeholder="contoh: budi_santoso"
                {...register('username', {
                  required: 'Username wajib diisi',
                  minLength: { value: 3, message: 'Minimal 3 karakter' },
                  maxLength: { value: 50, message: 'Maksimal 50 karakter' },
                  pattern: {
                    value: /^[a-zA-Z0-9_]+$/,
                    message: 'Hanya huruf, angka, dan underscore',
                  },
                })}
              />
              {errors.username && (
                <p className="text-xs text-status-danger mt-1">{errors.username.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="profil-email">Email</label>
              <input
                id="profil-email"
                type="email"
                className="input"
                placeholder="Kosongkan jika tidak punya email"
                {...register('email')}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <><Spinner size="sm" /> Menyimpan...</> : 'Simpan perubahan'}
              </button>
              <button type="button" onClick={handleBatal} className="btn-secondary">
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-5">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-primary-tint flex items-center
                                justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className="text-sm font-semibold text-text-primary">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
