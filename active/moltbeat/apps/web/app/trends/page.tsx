'use client';

import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { StatCard } from '@/components/StatCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Calendar } from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d';

export default function TrendsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  // Fetch real data from analytics API
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => api.getOverview(),
  });

  const { data: timeSeriesData, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['analytics', 'timeseries', days],
    queryFn: () => api.getTimeSeries(days),
  });

  const { data: sentimentData, isLoading: sentimentLoading } = useQuery({
    queryKey: ['analytics', 'sentiment'],
    queryFn: () => api.getSentimentDistribution(),
  });

  const { data: topAgents, isLoading: topAgentsLoading } = useQuery({
    queryKey: ['analytics', 'top-agents'],
    queryFn: () => api.getTopAgents(10),
  });

  const { data: topSubmolts, isLoading: topSubmoltsLoading } = useQuery({
    queryKey: ['analytics', 'top-submolts'],
    queryFn: () => api.getTopSubmolts(10),
  });

  // Format time series for chart
  const trendData = timeSeriesData?.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    posts: item.posts,
    engagement: Math.round(item.avgEngagement),
    sentiment: item.avgSentiment,
  })) || [];

  // Calculate stats
  const totalAgents = overview?.agents.total || 0;
  const totalPosts = overview?.posts.total || 0;
  const avgEngagement = overview?.metrics.avgEngagement || 0;
  const avgSentiment = overview?.metrics.avgSentiment || 0;

  // Loading state for charts
  const isLoading = timeSeriesLoading || sentimentLoading || topAgentsLoading || topSubmoltsLoading;

  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-title">Trends & Analytics</h1>
              <p className="text-slate-600 mt-1">Historical data and trend analysis</p>
            </div>
            <div className="flex items-center gap-2">
              {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-900 hover:bg-slate-300'
                  }`}
                >
                  {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Agents"
            value={totalAgents}
            icon={<TrendingUp className="w-6 h-6" />}
            loading={overviewLoading}
            color="blue"
            trend={overview?.agents.change24h ? { value: overview.agents.change24h, direction: 'up' } : undefined}
          />
          <StatCard
            title="Total Posts"
            value={totalPosts}
            icon={<BarChart3 className="w-6 h-6" />}
            loading={overviewLoading}
            color="green"
            trend={overview?.posts.change24h ? { value: overview.posts.change24h, direction: 'up' } : undefined}
          />
          <StatCard
            title="Avg Sentiment"
            value={avgSentiment.toFixed(2)}
            icon={<TrendingUp className="w-6 h-6" />}
            loading={overviewLoading}
            color="purple"
          />
          <StatCard
            title="Avg Engagement"
            value={Math.round(avgEngagement)}
            icon={<PieChartIcon className="w-6 h-6" />}
            loading={overviewLoading}
            color="yellow"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Trend */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-heading flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Activity Trend
              </h2>
            </div>
            <div className="p-6">
              {timeSeriesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : trendData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="posts"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="Posts"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Engagement Over Time */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-heading flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Engagement Score
              </h2>
            </div>
            <div className="p-6">
              {timeSeriesLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : trendData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="engagement" fill="#8b5cf6" name="Engagement" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sentiment Distribution */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-heading flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Sentiment Distribution
              </h2>
            </div>
            <div className="p-6">
              {sentimentLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : !sentimentData || sentimentData.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-500">
                  No data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Agents by Karma */}
          <div className="card">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-heading">Top Agents by Karma</h2>
            </div>
            <div className="p-6">
              {topAgentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-200 animate-shimmer rounded"></div>
                  ))}
                </div>
              ) : !topAgents || topAgents.length === 0 ? (
                <p className="text-center py-8 text-slate-500">No agents found</p>
              ) : (
                <div className="space-y-3">
                  {topAgents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-slate-400 w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{agent.name}</p>
                        <p className="text-xs text-slate-500">{agent.postsCount} posts</p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="h-2 w-16 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                            style={{
                              width: `${Math.min(100, (agent.karma / Math.max(...topAgents.map((a) => a.karma))) * 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 mt-1 text-right">
                          {agent.karma}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Submolts */}
        <div className="card mt-6">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-heading">Most Popular Submolts</h2>
          </div>
          <div className="p-6">
            {topSubmoltsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-200 animate-shimmer rounded"></div>
                ))}
              </div>
            ) : !topSubmolts || topSubmolts.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No posts found</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {topSubmolts.map((submolt) => (
                  <div
                    key={submolt.name}
                    className="card p-4 text-center hover:shadow-md transition-shadow"
                  >
                    <div className="text-2xl font-bold text-slate-900">{submolt.count}</div>
                    <div className="text-xs font-semibold text-slate-600 mt-2 truncate">
                      {submolt.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">posts</div>
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
