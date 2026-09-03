import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — menangkap runtime error di React tree.
 *
 * Dipakai sebagai fallback UI saat:
 *  - Komponen throw error yang tidak tertangkap
 *  - API down menyebabkan data tidak valid di-render
 *  - Chunk JS gagal dimuat (lazy import error)
 *
 * Cara pakai:
 *   <ErrorBoundary>
 *     <KomponenYangBisaError />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log error ke console di development
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
    // Di production bisa dikirim ke error tracking service (Sentry, dll)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isChunkError =
      this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
      this.state.error?.message?.includes('Loading chunk');

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-4 text-center"
        role="alert"
      >
        <div className="w-16 h-16 rounded-[16px] bg-status-warning-bg flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-status-warning" />
        </div>

        <div className="max-w-md">
          <h2 className="text-lg font-bold text-text-primary mb-2">
            {isChunkError ? 'Versi baru tersedia' : 'Terjadi kesalahan'}
          </h2>
          <p className="text-sm text-text-secondary">
            {isChunkError
              ? 'Aplikasi telah diperbarui. Muat ulang halaman untuk mendapatkan versi terbaru.'
              : 'Halaman ini mengalami kesalahan yang tidak terduga. Coba muat ulang halaman.'}
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-3 text-left text-xs bg-surface-page border border-border rounded-[8px] p-3 overflow-auto max-h-32 text-status-danger">
              {this.state.error.message}
            </pre>
          )}
        </div>

        <button
          onClick={this.handleReset}
          className="btn-primary gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Muat ulang halaman
        </button>
      </div>
    );
  }
}
