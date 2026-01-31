'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const { data: agents } = useQuery({
    queryKey: ['agents', 'all'],
    queryFn: () => api.getAgents({ limit: 100 }),
  });

  const { data: posts } = useQuery({
    queryKey: ['posts', 'analytics'],
    queryFn: () => api.getPosts({ limit: 100 }),
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics', 'analytics'],
    queryFn: () => api.getMetrics({}),
  });

  // Calculate analytics
  const totalAgents = agents?.pagination.total || 0;
  const activeAgents = agents?.data.filter((a) => a.status === 'ACTIVE').length || 0;
  const totalPosts = posts?.pagination.total || 0;
  const avgSentiment =
    posts?.data.reduce((sum, p) => sum + p.sentiment, 0) / (posts?.data.length || 1) || 0;

  // Status distribution
  const statusData = [
    { name: 'Active', value: agents?.data.filter((a) => a.status === 'ACTIVE').length || 0, color: '#10b981' },
    { name: 'Paused', value: agents?.data.filter((a) => a.status === 'PAUSED').length || 0, color: '#f59e0b' },
    { name: 'Error', value: agents?.data.filter((a) => a.status === 'ERROR').length || 0, color: '#ef4444' },
  ];

  // Top agents by karma
  const topAgents = [...(agents?.data || [])]
    .sort((a, b) => b.karma - a.karma)
    .slice(0, 10)
    .map((a) => ({ name: a.name, karma: a.karma }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Agents" value={totalAgents} />
          <StatCard title="Active Agents" value={activeAgents} />
          <StatCard title="Total Posts" value={totalPosts} />
          <StatCard title="Avg Sentiment" value={avgSentiment.toFixed(2)} />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Status Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Agent Status Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Agents by Karma */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Top Agents by Karma</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topAgents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="karma" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics Summary */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Metrics Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Total Metrics</p>
                <p className="text-2xl font-bold mt-2">{metrics?.length || 0}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Avg Post Engagement</p>
                <p className="text-2xl font-bold mt-2">
                  {posts?.data.length
                    ? Math.round(
                        posts.data.reduce((sum, p) => sum + p.engagementScore, 0) / posts.data.length
                      )
                    : 0}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Total Karma</p>
                <p className="text-2xl font-bold mt-2">
                  {agents?.data.reduce((sum, a) => sum + a.karma, 0) || 0}
                </p>
              </div>
            </div>
          </div>
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
