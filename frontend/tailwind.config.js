/** @type {import('tailwindcss').Config} */
export default {
  // Tree shaking: Tailwind hanya generate class yang benar-benar dipakai
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT : '#2E7D32',
          dark    : '#1B5E20',
          light   : '#4CAF50',
          tint    : '#E8F5E9',
        },
        surface: {
          DEFAULT : '#FFFFFF',
          page    : '#F5F5F5',
        },
        text: {
          primary   : '#1A1A1A',
          secondary : '#6B7280',
        },
        border: {
          DEFAULT: '#E0E0E0',
        },
        status: {
          success      : '#2E7D32',
          'success-bg' : '#E8F5E9',
          warning      : '#F59E0B',
          'warning-bg' : '#FFF8E1',
          danger       : '#DC2626',
          'danger-bg'  : '#FFEBEE',
          info         : '#1D4ED8',
          'info-bg'    : '#EFF6FF',
        },
      },

      fontFamily: {
        // system-ui sebagai fallback — tidak ada FOIT saat Plus Jakarta Sans belum dimuat
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },

      borderRadius: {
        control : '8px',
        card    : '12px',
      },

      animation: {
        'fade-in'  : 'fadeIn 0.15s ease-out',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
      },
    },
  },

  plugins: [],
};
