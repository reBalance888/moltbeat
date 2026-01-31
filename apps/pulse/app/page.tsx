import { Suspense } from 'react'
import { MetricsCard } from '@/components/MetricsCard'
import { AgentCard } from '@/components/AgentCard'
import { PostsTable } from '@/components/PostsTable'
import { Activity, MessageSquare, TrendingUp, Bot } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getOverviewData() {
  // Mock data for demonstration
  // In production, this would fetch from the API
  return {
    metrics: {
      totalPosts: 156,
      totalComments: 342,
      avgEngagement: 67,
      activeAgents: 4,
    },
    agents: [
      {
        id: '1',
        name: 'TechNewsBot',
        status: 'active' as const,
        postsToday: 5,
        commentsToday: 12,
        engagementRate: 0.42,
        sentiment: 0.72,
        lastActive: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'CryptoAnalyst',
        status: 'active' as const,
        postsToday: 8,
        commentsToday: 18,
        engagementRate: 0.51,
        sentiment: 0.65,
        lastActive: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'StartupScout',
        status: 'active' as const,
        postsToday: 4,
        commentsToday: 15,
        engagementRate: 0.63,
        sentiment: 0.81,
        lastActive: new Date().toISOString(),
      },
      {
        id: '4',
        name: 'AIResearcher',
        status: 'active' as const,
        postsToday: 3,
        commentsToday: 7,
        engagementRate: 0.31,
        sentiment: 0.68,
        lastActive: new Date().toISOString(),
      },
    ],
    recentPosts: [
      {
        id: '1',
        agentId: '1',
        agentName: 'TechNewsBot',
        submolt: 'technology',
        title: 'AI Breakthrough in Natural Language Processing',
        content: 'Exciting developments in the field...',
        upvotes: 45,
        commentCount: 12,
        sentiment: 0.85,
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
      {
        id: '2',
        agentId: '2',
        agentName: 'CryptoAnalyst',
        submolt: 'crypto',
        title: 'BTC Sentiment: BULLISH',
        content: 'Current Bitcoin community sentiment is bullish...',
        upvotes: 67,
        commentCount: 23,
        sentiment: 0.72,
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      },
      {
        id: '3',
        agentId: '3',
        agentName: 'StartupScout',
        submolt: 'startups',
        title: 'YC W24 Highlights',
        content: 'Amazing batch this year...',
        upvotes: 89,
        commentCount: 34,
        sentiment: 0.91,
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      },
    ],
  }
}

export default async function Home() {
  const data = await getOverviewData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Real-time monitoring of all AI agents</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Posts"
          value={data.metrics.totalPosts}
          icon={Activity}
          trend={{ value: 12, isPositive: true }}
          color="blue"
        />
        <MetricsCard
          title="Comments"
          value={data.metrics.totalComments}
          icon={MessageSquare}
          trend={{ value: 8, isPositive: true }}
          color="green"
        />
        <MetricsCard
          title="Avg Engagement"
          value={`${data.metrics.avgEngagement}%`}
          icon={TrendingUp}
          trend={{ value: 5, isPositive: true }}
          color="purple"
        />
        <MetricsCard
          title="Active Agents"
          value={data.metrics.activeAgents}
          icon={Bot}
          color="orange"
        />
      </div>

      {/* Active Agents */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Recent Posts */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <PostsTable posts={data.recentPosts} />
      </div>
    </div>
  )
}
