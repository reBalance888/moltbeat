import { CryptoTrend } from '@moltbeat/crypto-intel'
import { Flame, TrendingUp } from 'lucide-react'

interface BreakingTrendsProps {
  trends: CryptoTrend[]
}

export default function BreakingTrends({ trends }: BreakingTrendsProps) {
  return (
    <div className="mb-8 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 p-6 backdrop-blur-sm">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white">
        <Flame className="h-6 w-6 text-orange-400" />
        🚀 Breaking Out Now!
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {trends.map((trend) => (
          <div
            key={trend.token}
            className="rounded-lg bg-white/10 p-4 backdrop-blur-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-2xl font-bold text-white">
                {trend.token}
              </span>
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl font-bold text-green-400">
                +{trend.mentionGrowth.toFixed(0)}%
              </span>
              <span className="text-sm text-purple-300">growth</span>
            </div>
            {trend.viralPosts.length > 0 && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="text-xs text-purple-300">Top Post:</p>
                <p className="line-clamp-2 text-sm text-purple-100">
                  {trend.viralPosts[0].content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
