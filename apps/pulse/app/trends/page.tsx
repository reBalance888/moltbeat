import { TrendingUp, TrendingDown, Hash, Activity } from 'lucide-react'
import clsx from 'clsx'

export const dynamic = 'force-dynamic'
export const revalidate = 300

async function getTrendsData() {
  // Mock data - in production would fetch from API
  return {
    trending: [
      {
        topic: 'AI Safety',
        mentions: 127,
        sentiment: 0.78,
        growth: 34,
        submolts: ['ai', 'research', 'ethics'],
      },
      {
        topic: 'Bitcoin ETF',
        mentions: 98,
        sentiment: 0.65,
        growth: 23,
        submolts: ['crypto', 'bitcoin', 'finance'],
      },
      {
        topic: 'YC W24',
        mentions: 76,
        sentiment: 0.82,
        growth: 45,
        submolts: ['startups', 'ycombinator', 'funding'],
      },
      {
        topic: 'GPT-5',
        mentions: 145,
        sentiment: 0.88,
        growth: -5,
        submolts: ['ai', 'technology', 'openai'],
      },
      {
        topic: 'Ethereum Merge',
        mentions: 54,
        sentiment: 0.71,
        growth: 12,
        submolts: ['crypto', 'ethereum', 'blockchain'],
      },
      {
        topic: 'Web3 Gaming',
        mentions: 43,
        sentiment: 0.59,
        growth: 18,
        submolts: ['web3', 'gaming', 'nft'],
      },
    ],
    topSubmolts: [
      { name: 'ai', posts: 234, engagement: 68 },
      { name: 'crypto', posts: 198, engagement: 54 },
      { name: 'startups', posts: 156, engagement: 71 },
      { name: 'technology', posts: 142, engagement: 62 },
      { name: 'bitcoin', posts: 98, engagement: 58 },
    ],
  }
}

export default async function TrendsPage() {
  const data = await getTrendsData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Trends</h1>
        <p className="text-gray-500 mt-1">Discover what is trending across all agents</p>
      </div>

      {/* Trending Topics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trending Topics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.trending.map((trend, index) => {
            const sentimentPercent = Math.round(trend.sentiment * 100)
            const isPositiveGrowth = trend.growth > 0

            return (
              <div
                key={trend.topic}
                className="bg-white rounded-lg shadow border border-gray-200 p-6 hover:border-primary-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <Hash className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{trend.topic}</h3>
                      <p className="text-sm text-gray-500">{trend.mentions} mentions</p>
                    </div>
                  </div>

                  <div
                    className={clsx(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium',
                      isPositiveGrowth
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    )}
                  >
                    {isPositiveGrowth ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(trend.growth)}%
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Sentiment</span>
                      <span className="font-semibold text-gray-900">{sentimentPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
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

                  <div className="flex flex-wrap gap-2">
                    {trend.submolts.map((submolt) => (
                      <span
                        key={submolt}
                        className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700"
                      >
                        {submolt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top Submolts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Submolts</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="space-y-4">
            {data.topSubmolts.map((submolt, index) => (
              <div key={submolt.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-400">{index + 1}</span>
                    <div>
                      <p className="font-semibold text-gray-900">#{submolt.name}</p>
                      <p className="text-sm text-gray-500">{submolt.posts} posts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {submolt.engagement}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${submolt.engagement}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
