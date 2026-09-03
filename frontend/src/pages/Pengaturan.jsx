import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { authAPI } from '../api';
import { getErrorMessage } from '../utils/helpers';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';

function PasswordField({ label, id, register: reg, name, rules, error, watch }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4
                         text-text-secondary pointer-events-none" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`input pl-9 pr-10 ${error ? 'input-error' : ''}`}
          {...reg(name, rules)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
          className="absolute right-3 top-1/2 -translate-y-1/2
                     text-text-secondary hover:text-text-primary transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-status-danger mt-1">{error.message}</p>}
    </div>
  );
}

export default function Pengaturan() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.changePassword({
        password_lama: data.password_lama,
        password_baru: data.password_baru,
      });
      toast.success('Password berhasil diubah');
      reset();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">

      {/* Ubah password */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-primary-tint flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Ubah password</h3>
              <p className="text-xs text-text-secondary">Gunakan password yang kuat dan unik</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card-body space-y-4">
          <PasswordField
            label="Password saat ini *"
            id="password_lama"
            register={register}
            name="password_lama"
            rules={{ required: 'Password saat ini wajib diisi' }}
            error={errors.password_lama}
          />
          <PasswordField
            label="Password baru *"
            id="password_baru"
            register={register}
            name="password_baru"
            rules={{
              required: 'Password baru wajib diisi',
              minLength: { value: 8, message: 'Minimal 8 karakter' },
              validate: (v) =>
                v !== watch('password_lama') || 'Password baru tidak boleh sama dengan yang lama',
            }}
            error={errors.password_baru}
          />
          <PasswordField
            label="Konfirmasi password baru *"
            id="konfirmasi"
            register={register}
            name="konfirmasi"
            rules={{
              required: 'Konfirmasi password wajib diisi',
              validate: (v) =>
                v === watch('password_baru') || 'Konfirmasi password tidak cocok',
            }}
            error={errors.konfirmasi}
          />

          {/* Petunjuk kekuatan password */}
          <div className="bg-primary-tint rounded-[8px] px-4 py-3 text-xs text-text-secondary space-y-1 border border-primary/20">
            <p className="font-semibold text-primary-dark mb-1.5">Syarat password yang baik:</p>
            {[
              'Minimal 8 karakter',
              'Kombinasi huruf besar dan kecil',
              'Mengandung angka atau simbol (!, @, #, dll.)',
            ].map((t) => (
              <p key={t} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block flex-shrink-0" />
                {t}
              </p>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><Spinner size="sm" /> Menyimpan...</> : 'Simpan password baru'}
            </button>
            <button type="button" onClick={() => reset()} className="btn-secondary">
              Reset form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
