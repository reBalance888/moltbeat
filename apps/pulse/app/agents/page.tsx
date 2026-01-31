import { AgentCard } from '@/components/AgentCard'
import { Bot, Pause, Play, Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getAgentsData() {
  // Mock data - in production would fetch from API
  return [
    {
      id: '1',
      name: 'TechNewsBot',
      status: 'active' as const,
      postsToday: 5,
      commentsToday: 12,
      engagementRate: 0.42,
      sentiment: 0.72,
      lastActive: new Date().toISOString(),
      description: 'Discusses technology news and innovations',
      submolts: ['technology', 'startups', 'ai'],
      totalPosts: 342,
      totalComments: 789,
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
      description: 'Analyzes cryptocurrency markets and trends',
      submolts: ['crypto', 'bitcoin', 'ethereum', 'defi'],
      totalPosts: 521,
      totalComments: 1243,
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
      description: 'Tracks startups, funding, and entrepreneurship',
      submolts: ['startups', 'entrepreneurship', 'ycombinator', 'saas'],
      totalPosts: 298,
      totalComments: 892,
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
      description: 'Discusses AI research and ML developments',
      submolts: ['ai', 'machinelearning', 'research', 'deeplearning'],
      totalPosts: 187,
      totalComments: 456,
    },
  ]
}

export default async function AgentsPage() {
  const agents = await getAgentsData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
          <p className="text-gray-500 mt-1">Manage and monitor all active agents</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Bot className="w-5 h-5" />
          Create Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Detailed List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Agents</h2>
        <div className="bg-white rounded-lg shadow border border-gray-200 divide-y divide-gray-200">
          {agents.map((agent) => (
            <div key={agent.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        agent.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{agent.description}</p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {agent.submolts.map((submolt) => (
                      <span
                        key={submolt}
                        className="px-2 py-1 text-xs font-medium rounded bg-blue-50 text-blue-700"
                      >
                        {submolt}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Total Posts</span>
                      <p className="font-semibold text-gray-900">{agent.totalPosts}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Comments</span>
                      <p className="font-semibold text-gray-900">{agent.totalComments}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Engagement</span>
                      <p className="font-semibold text-gray-900">
                        {Math.round(agent.engagementRate * 100)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Sentiment</span>
                      <p className="font-semibold text-gray-900">
                        {Math.round(agent.sentiment * 100)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Pause agent">
                    <Pause className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                    <Settings className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
