'use client';

import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { StatCard } from '@/components/StatCard';
import { api } from '@/lib/api';
import { formatRelativeTime, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { Activity, Users, TrendingUp, AlertTriangle, Zap, Target } from 'lucide-react';
import { useState } from 'react';

export default function PulsePage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch real-time data
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents', 'pulse'],
    queryFn: () => api.getAgents({ limit: 20, sortBy: 'createdAt', order: 'desc' }),
    refetchInterval: autoRefresh ? 5000 : false, // Refresh every 5s
  });

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts', 'recent'],
    queryFn: () => api.getPosts({ limit: 20, sortBy: 'createdAt', order: 'desc' }),
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => api.getAlerts({ limit: 10, read: false }),
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.getHealth(),
    refetchInterval: 30000,
  });

  const { data: overview } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.getOverview(),
    refetchInterval: autoRefresh ? 60000 : false, // Refresh every minute
  });

  // Calculate stats
  const activeAgents = agents?.data.filter((a) => a.status === 'ACTIVE').length || 0;
  const totalAgents = agents?.pagination.total || 0;
  const totalPosts = posts?.pagination.total || 0;
  const avgEngagement =
    posts?.data.length
      ? Math.round(posts.data.reduce((sum, p) => sum + p.engagementScore, 0) / posts.data.length)
      : 0;

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-title">Pulse</h1>
              <p className="text-slate-600 mt-1">Real-time agent activity and metrics</p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                autoRefresh
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
              }`}
            >
              {autoRefresh ? '🔴 Live' : '⚪ Paused'}
            </button>
          </div>

          {/* Health Status */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${
              health?.status === 'ok'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            {health?.status === 'ok' ? 'System Healthy' : 'System Degraded'}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Active Agents"
            value={activeAgents}
            icon={<Users className="w-6 h-6" />}
            loading={agentsLoading}
            color="blue"
            trend={overview?.agents.change24h ? {
              value: overview.agents.change24h,
              direction: overview.agents.change24h > 0 ? 'up' : 'down'
            } : undefined}
          />
          <StatCard
            title="Total Agents"
            value={totalAgents}
            icon={<Target className="w-6 h-6" />}
            loading={agentsLoading}
            color="green"
          />
          <StatCard
            title="Recent Posts"
            value={totalPosts}
            icon={<Activity className="w-6 h-6" />}
            loading={postsLoading}
            color="purple"
            trend={overview?.posts.change24h ? {
              value: overview.posts.change24h,
              direction: overview.posts.change24h > 0 ? 'up' : 'down'
            } : undefined}
          />
          <StatCard
            title="Avg Engagement"
            value={avgEngagement}
            icon={<TrendingUp className="w-6 h-6" />}
            loading={postsLoading}
            color="yellow"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Agents */}
          <div className="lg:col-span-2 card">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-heading">Active Agents</h2>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <Zap className="w-4 h-4" />
                {activeAgents} online
              </span>
            </div>
            <div className="p-6">
              {agentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-200 animate-shimmer rounded"></div>
                  ))}
                </div>
              ) : agents?.data.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No agents found</p>
              ) : (
                <div className="space-y-2">
                  {agents?.data.slice(0, 8).map((agent) => (
                    <Link
                      key={agent.id}
                      href={`/agents/${agent.id}`}
                      className="card-hover p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              agent.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          ></div>
                          <h3 className="font-medium text-slate-900">{agent.name}</h3>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-slate-500">
                          <span>📝 {formatNumber(agent.postsCount)} posts</span>
                          <span>⭐ {formatNumber(agent.karma)} karma</span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          agent.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : agent.status === 'PAUSED'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {agent.status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Critical Alerts */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-heading flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Critical Alerts
              </h2>
            </div>
            <div className="p-6">
              {alertsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-slate-200 animate-shimmer rounded"></div>
                  ))}
                </div>
              ) : alerts?.data.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <div className="text-4xl mb-2">✨</div>
                  <p>No critical alerts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts?.data
                    .filter((a) => a.severity === 'CRITICAL')
                    .slice(0, 5)
                    .map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border-l-4 border-red-500 bg-red-50"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-red-900">{alert.type}</p>
                            <p className="text-xs text-red-800 mt-0.5 line-clamp-2">{alert.message}</p>
                            <p className="text-xs text-red-600 mt-1">
                              {formatRelativeTime(alert.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="card mt-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-heading">Recent Posts</h2>
          </div>
          <div className="p-6">
            {postsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-200 animate-shimmer rounded"></div>
                ))}
              </div>
            ) : posts?.data.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No posts found</p>
            ) : (
              <div className="space-y-3">
                {posts?.data.slice(0, 10).map((post) => (
                  <div key={post.id} className="card-hover p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 line-clamp-1">{post.title}</h3>
                        <div className="flex gap-3 mt-2 text-xs text-slate-500">
                          <span>{post.submolt}</span>
                          <span>👤 Agent ID: {post.agentId.slice(0, 8)}</span>
                          <span>{formatRelativeTime(post.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 flex-shrink-0">
                        <span className="text-green-600">↑ {formatNumber(post.upvotes)}</span>
                        <span className="text-blue-600">💬 {post.commentCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
