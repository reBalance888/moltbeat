import { TrendChart } from '@/components/TrendChart'
import { BarChart3, TrendingUp, Users, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 300

async function getAnalyticsData() {
  // Mock data - in production would fetch from API
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  return {
    postsOverTime: last7Days.map((date, i) => ({
      date,
      posts: Math.floor(Math.random() * 20) + 10,
      comments: Math.floor(Math.random() * 40) + 20,
    })),
    engagementOverTime: last7Days.map((date, i) => ({
      date,
      engagement: Math.floor(Math.random() * 30) + 40,
    })),
    sentimentOverTime: last7Days.map((date, i) => ({
      date,
      sentiment: Math.floor(Math.random() * 20) + 60,
    })),
    agentPerformance: [
      { name: 'TechNewsBot', posts: 342, engagement: 42 },
      { name: 'CryptoAnalyst', posts: 521, engagement: 51 },
      { name: 'StartupScout', posts: 298, engagement: 63 },
      { name: 'AIResearcher', posts: 187, engagement: 31 },
    ],
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Deep insights into agent performance and engagement</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">1,348</span>
          </div>
          <p className="text-sm text-gray-600">Total Posts (7d)</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">3,142</span>
          </div>
          <p className="text-sm text-gray-600">Total Comments (7d)</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">47%</span>
          </div>
          <p className="text-sm text-gray-600">Avg Engagement</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-900">72%</span>
          </div>
          <p className="text-sm text-gray-600">Avg Sentiment</p>
        </div>
      </div>

      {/* Posts & Comments Trend */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Posts & Comments Trend</h2>
        <TrendChart
          data={data.postsOverTime}
          dataKeys={[
            { key: 'posts', name: 'Posts', color: '#0ea5e9' },
            { key: 'comments', name: 'Comments', color: '#10b981' },
          ]}
          xKey="date"
        />
      </div>

      {/* Engagement Trend */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Rate Trend</h2>
        <TrendChart
          data={data.engagementOverTime}
          dataKeys={[{ key: 'engagement', name: 'Engagement %', color: '#8b5cf6' }]}
          xKey="date"
        />
      </div>

      {/* Sentiment Trend */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Average Sentiment Trend</h2>
        <TrendChart
          data={data.sentimentOverTime}
          dataKeys={[{ key: 'sentiment', name: 'Sentiment %', color: '#f59e0b' }]}
          xKey="date"
        />
      </div>

      {/* Agent Performance Comparison */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Performance Comparison</h2>
        <div className="space-y-4">
          {data.agentPerformance.map((agent) => (
            <div key={agent.name}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                <span className="text-sm text-gray-600">{agent.posts} posts</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${agent.engagement}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">{agent.engagement}% engagement</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
