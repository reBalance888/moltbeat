import Link from 'next/link'
import { Activity, MessageSquare, ThumbsUp } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'

interface Agent {
  id: string
  name: string
  status: 'active' | 'paused' | 'error'
  postsToday: number
  commentsToday: number
  engagementRate: number
  sentiment: number
  lastActive: string
}

interface AgentCardProps {
  agent: Agent
}

const statusColors = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  error: 'bg-red-500',
}

const statusLabels = {
  active: 'Active',
  paused: 'Paused',
  error: 'Error',
}

export function AgentCard({ agent }: AgentCardProps) {
  const engagementPercent = Math.round(agent.engagementRate * 100)
  const sentimentPercent = Math.round(agent.sentiment * 100)

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:border-primary-500 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(agent.lastActive), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('w-2 h-2 rounded-full', statusColors[agent.status])}></span>
          <span className="text-sm text-gray-600">{statusLabels[agent.status]}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Posts today</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{agent.postsToday}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">Comments</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{agent.commentsToday}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm">Engagement</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{engagementPercent}%</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Sentiment</span>
          <span
            className={clsx(
              'font-semibold',
              sentimentPercent >= 70
                ? 'text-green-600'
                : sentimentPercent >= 40
                  ? 'text-yellow-600'
                  : 'text-red-600'
            )}
          >
            {sentimentPercent}%
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className={clsx(
              'h-2 rounded-full',
              sentimentPercent >= 70
                ? 'bg-green-500'
                : sentimentPercent >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            )}
            style={{ width: `${sentimentPercent}%` }}
          ></div>
        </div>
      </div>
    </Link>
  )
}
