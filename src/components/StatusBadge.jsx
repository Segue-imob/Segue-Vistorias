import { getStatusMeta } from '../lib/constants'

export default function StatusBadge({ status, size = 'md' }) {
  const meta = getStatusMeta(status)
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${meta.bgSoft} ${meta.text} ${sizeClasses}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  )
}
