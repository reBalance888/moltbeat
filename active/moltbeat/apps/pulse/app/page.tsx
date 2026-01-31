'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Activity, Users, TrendingUp, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
  // Fetch real data
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.getAgents({ limit: 10 }),
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', 'recent'],
    queryFn: () => api.getPosts({ limit: 10, sortBy: 'createdAt', order: 'desc' }),
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => api.getAlerts({ read: false, limit: 5 }),
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 30000, // Refresh every 30s
  });

  // Calculate stats from real data
  const activeAgents = agents?.data.filter((a) => a.status === 'ACTIVE').length || 0;
  const totalPosts = posts?.pagination.total || 0;
  const criticalAlerts = alerts?.data.filter((a) => a.severity === 'CRITICAL').length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">MoltBeat Pulse</h1>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm ${
                health?.status === 'ok'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {health?.status === 'ok' ? '🟢 Healthy' : '🔴 Degraded'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Agents"
            value={activeAgents}
            icon={<Users className="w-6 h-6" />}
            loading={agentsLoading}
            color="blue"
          />
          <StatCard
            title="Total Posts"
            value={totalPosts}
            icon={<Activity className="w-6 h-6" />}
            loading={postsLoading}
            color="green"
          />
          <StatCard
            title="Avg Engagement"
            value={
              posts?.data.length
                ? Math.round(
                    posts.data.reduce((sum, p) => sum + p.engagementScore, 0) / posts.data.length
                  )
                : 0
            }
            icon={<TrendingUp className="w-6 h-6" />}
            loading={postsLoading}
            color="purple"
          />
          <StatCard
            title="Critical Alerts"
            value={criticalAlerts}
            icon={<AlertTriangle className="w-6 h-6" />}
            loading={alertsLoading}
            color="red"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Agents */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Agents</h2>
            {agentsLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {agents?.data.slice(0, 5).map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agents/${agent.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{agent.name}</h3>
                        <p className="text-sm text-gray-500">{agent.postsCount} posts</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          agent.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
            {postsLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {posts?.data.slice(0, 5).map((post) => (
                  <div
                    key={post.id}
                    className="p-3 rounded-lg border border-gray-200"
                  >
                    <h3 className="font-medium text-sm line-clamp-1">{post.title}</h3>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{post.submolt}</span>
                      <span>↑ {post.upvotes} 💬 {post.commentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Recent Alerts</h2>
            {alertsLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : alerts?.data.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No alerts</p>
            ) : (
              <div className="space-y-3">
                {alerts?.data.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.severity === 'CRITICAL'
                        ? 'border-red-500 bg-red-50'
                        : alert.severity === 'HIGH'
                        ? 'border-orange-500 bg-orange-50'
                        : alert.severity === 'MEDIUM'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{alert.severity}</span>
                          <span className="text-xs text-gray-500">{alert.type}</span>
                        </div>
                        <p className="mt-1">{alert.message}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading: boolean;
  color: 'blue' | 'green' | 'purple' | 'red';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
          ) : (
            <p className="text-3xl font-bold mt-2">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
    </div>
  );
}
