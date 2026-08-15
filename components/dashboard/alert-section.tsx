import Link from 'next/link'
import { AlertTriangle, XCircle, Info, TrendingUp, Calculator, BarChart2 } from 'lucide-react'
import type { DashboardAlert } from '@/lib/dashboard/actions'

interface AlertSectionProps {
  alerts: DashboardAlert[]
}

const SEVERITY_STYLES = {
  error: {
    wrapper: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900',
    icon: 'text-red-600',
    text: 'text-red-800 dark:text-red-300',
    detail: 'text-red-600 dark:text-red-400',
    Icon: XCircle,
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900',
    icon: 'text-amber-600',
    text: 'text-amber-800 dark:text-amber-300',
    detail: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    wrapper: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900',
    icon: 'text-blue-600',
    text: 'text-blue-800 dark:text-blue-300',
    detail: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
}

const TYPE_ICONS = {
  food_cost_high: TrendingUp,
  price_increase: BarChart2,
  no_hpp: Calculator,
}

function AlertItem({ alert }: { alert: DashboardAlert }) {
  const style = SEVERITY_STYLES[alert.severity]
  const TypeIcon = TYPE_ICONS[alert.type]

  const href =
    alert.type === 'food_cost_high' || alert.type === 'no_hpp'
      ? alert.menuId
        ? `/profitability/${alert.menuId}`
        : '/profitability'
      : alert.materialId
        ? `/materials/${alert.materialId}`
        : '/materials'

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 hover:opacity-90 transition-opacity ${style.wrapper}`}
    >
      <TypeIcon className={`h-4 w-4 mt-0.5 shrink-0 ${style.icon}`} />
      <div className="min-w-0">
        <p className={`text-sm font-medium ${style.text}`}>{alert.message}</p>
        {alert.detail && (
          <p className={`text-xs mt-0.5 ${style.detail}`}>{alert.detail}</p>
        )}
      </div>
    </Link>
  )
}

export function AlertSection({ alerts }: AlertSectionProps) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900 px-4 py-3">
        <span className="text-green-600 text-lg">✓</span>
        <p className="text-sm text-green-800 dark:text-green-300 font-medium">
          Semua menu dalam kondisi baik
        </p>
      </div>
    )
  }

  const errors = alerts.filter((a) => a.severity === 'error')
  const warnings = alerts.filter((a) => a.severity === 'warning')
  const infos = alerts.filter((a) => a.severity === 'info')

  return (
    <div className="space-y-2">
      {[...errors, ...warnings, ...infos].slice(0, 8).map((alert, idx) => (
        <AlertItem key={idx} alert={alert} />
      ))}
      {alerts.length > 8 && (
        <p className="text-xs text-muted-foreground px-1">
          +{alerts.length - 8} notifikasi lainnya
        </p>
      )}
    </div>
  )
}
