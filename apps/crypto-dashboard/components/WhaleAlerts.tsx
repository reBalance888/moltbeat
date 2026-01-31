import { WhaleActivity } from '@moltbeat/crypto-intel'
import { AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WhaleAlertsProps {
  alerts: WhaleActivity
}

export default function WhaleAlerts({ alerts }: WhaleAlertsProps) {
  if (alerts.mentions.length === 0) {
    return null
  }

  return (
    <div className="mt-6 rounded-lg bg-white/10 p-6 backdrop-blur-sm">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
        <AlertTriangle className="h-6 w-6 text-yellow-400" />
        🐋 Whale Activity Alerts
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {alerts.mentions.slice(0, 6).map((mention, index) => (
          <div
            key={index}
            className="rounded-lg bg-white/5 p-4 transition hover:bg-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="rounded bg-yellow-500/20 px-2 py-1 text-xs font-semibold text-yellow-200">
                {mention.token}
              </span>
              <span className="text-xs text-purple-300">
                {formatDistanceToNow(mention.timestamp, { addSuffix: true })}
              </span>
            </div>
            <p className="mb-2 line-clamp-2 text-sm text-purple-100">
              {mention.content}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-300">by {mention.author}</span>
              <span className="text-xs text-purple-400">
                • {mention.keywords.join(', ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
