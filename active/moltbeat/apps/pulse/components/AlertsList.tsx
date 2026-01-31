import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  source: string
  createdAt: string
  read: boolean
}

interface AlertsListProps {
  alerts: Alert[]
}

const alertConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-900',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-600',
    textColor: 'text-yellow-900',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    textColor: 'text-red-900',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-600',
    textColor: 'text-green-900',
  },
}

export function AlertsList({ alerts }: AlertsListProps) {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
      {alerts.map((alert) => {
        const config = alertConfig[alert.type]
        const Icon = config.icon
        const timeAgo = formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })

        return (
          <div
            key={alert.id}
            className={clsx(
              'p-6 transition-colors',
              !alert.read && 'bg-gray-50',
              'hover:bg-gray-100'
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={clsx(
                  'p-2 rounded-lg',
                  config.bgColor,
                  `border ${config.borderColor}`
                )}
              >
                <Icon className={clsx('w-5 h-5', config.iconColor)} />
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={clsx('font-medium', config.textColor)}>{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">{alert.source}</span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{timeAgo}</span>
                    </div>
                  </div>

                  {!alert.read && (
                    <span className="ml-4 flex-shrink-0 w-2 h-2 bg-primary-600 rounded-full"></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
