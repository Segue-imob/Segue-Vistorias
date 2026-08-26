import { AlertTriangle } from 'lucide-react'

export default function WarningBanner({ message }) {
  if (!message) return null

  return (
    <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
