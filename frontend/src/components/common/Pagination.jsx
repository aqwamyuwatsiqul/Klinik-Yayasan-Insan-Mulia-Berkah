import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPage <= 1) return null;

  const { page, totalPage, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to   = Math.min(page * limit, total);

  const range = [];
  for (let i = Math.max(1, page - 1); i <= Math.min(totalPage, page + 1); i++) {
    range.push(i);
  }

  const btnBase =
    'w-8 h-8 rounded-[8px] text-sm font-medium transition-colors flex items-center justify-center';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-text-secondary">
        Menampilkan <span className="font-semibold text-text-primary">{from}–{to}</span>{' '}
        dari <span className="font-semibold text-text-primary">{total}</span> data
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Halaman sebelumnya"
          className={`${btnBase} hover:bg-primary-tint disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {range[0] > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={`${btnBase} hover:bg-primary-tint text-text-secondary`}>1</button>
            {range[0] > 2 && <span className="text-text-secondary px-1">…</span>}
          </>
        )}

        {range.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btnBase} ${
              p === page
                ? 'bg-primary text-white shadow-sm'
                : 'hover:bg-primary-tint text-text-secondary'
            }`}
          >
            {p}
          </button>
        ))}

        {range[range.length - 1] < totalPage && (
          <>
            {range[range.length - 1] < totalPage - 1 && <span className="text-text-secondary px-1">…</span>}
            <button onClick={() => onPageChange(totalPage)} className={`${btnBase} hover:bg-primary-tint text-text-secondary`}>{totalPage}</button>
          </>
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPage}
          aria-label="Halaman berikutnya"
          className={`${btnBase} hover:bg-primary-tint disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
