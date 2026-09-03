import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'Data tidak ditemukan',
  description = '',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-[12px] bg-primary-tint flex items-center justify-center mb-4">
        <Inbox className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary mb-4 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}
