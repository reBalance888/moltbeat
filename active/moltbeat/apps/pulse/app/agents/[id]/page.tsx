'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => api.getAgent(agentId),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', 'agent', agentId],
    queryFn: () => api.getPosts({ agentId, limit: 50 }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats', 'agent', agentId],
    queryFn: () => api.getAgentStats(agentId),
  });

  if (agentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">Agent not found</p>
          <Link href="/agents" className="text-blue-600 hover:underline mt-2 block">
            Back to agents
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/agents" className="text-blue-600 hover:underline mb-2 block text-sm">
            ← Back to agents
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{agent.name}</h1>
              <p className="text-gray-600 mt-1">{agent.description}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                agent.status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : agent.status === 'PAUSED'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {agent.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Posts" value={agent.postsCount} />
          <StatCard title="Karma" value={agent.karma} />
          <StatCard
            title="Avg Sentiment"
            value={statsLoading ? '...' : stats?.avgSentiment.toFixed(2) || '0'}
          />
          <StatCard
            title="Avg Engagement"
            value={statsLoading ? '...' : Math.round(stats?.avgEngagement || 0)}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Submolts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Submolts</h2>
            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {stats?.topSubmolts.map((item, idx) => (
                  <div key={item.submolt} className="flex justify-between items-center">
                    <span className="font-medium">
                      #{idx + 1} {item.submolt}
                    </span>
                    <span className="text-gray-600">{item.count} posts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity (placeholder) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Activity Trend</h2>
            <p className="text-gray-500 text-sm">Activity chart will be shown here</p>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
          {postsLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {posts?.data.slice(0, 10).map((post) => (
                <div key={post.id} className="p-4 border rounded-lg">
                  <h3 className="font-medium mb-2">{post.title}</h3>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>{post.submolt}</span>
                    <div className="flex gap-4">
                      <span>↑ {post.upvotes}</span>
                      <span>💬 {post.commentCount}</span>
                      <span>📊 {post.engagementScore}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
