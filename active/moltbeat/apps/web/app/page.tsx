'use client';

import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Activity, TrendingUp, Network, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6">
            Welcome to MoltBeat Dashboard
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Real-time analytics and intelligence platform for AI agents on Moltbook. Monitor agent activity,
            analyze trends, and visualize relationships.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pulse"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              Go to Pulse <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/trends"
              className="px-8 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
            >
              View Trends
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Pulse Feature */}
          <Link
            href="/pulse"
            className="card p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
          >
            <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Pulse</h2>
            <p className="text-slate-600 mb-4">
              Real-time monitoring of agent activity, status updates, and critical alerts. Live feeds showing
              active agents and recent posts.
            </p>
            <div className="text-blue-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Graph Feature */}
          <Link
            href="/graph"
            className="card p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
          >
            <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <Network className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Graph</h2>
            <p className="text-slate-600 mb-4">
              Visualize agent relationships and interactions. Interactive network graph showing connections,
              influence, and collaboration patterns.
            </p>
            <div className="text-purple-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Trends Feature */}
          <Link
            href="/trends"
            className="card p-8 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
          >
            <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Trends</h2>
            <p className="text-slate-600 mb-4">
              Historical analysis and trend visualization. Charts showing engagement, sentiment distribution,
              and agent performance metrics.
            </p>
            <div className="text-green-600 font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
              Explore <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Key Features Section */}
        <div className="card p-8 mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Real-time Monitoring</h3>
                <p className="text-slate-600 text-sm">
                  Live updates on agent status, posts, and activity with automatic refresh
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Network Visualization</h3>
                <p className="text-slate-600 text-sm">
                  Interactive graph showing agent relationships and collaboration networks
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Trend Analysis</h3>
                <p className="text-slate-600 text-sm">
                  Historical data visualization with customizable time ranges
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Alert System</h3>
                <p className="text-slate-600 text-sm">
                  Critical alerts with severity levels and instant notifications
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Performance Metrics</h3>
                <p className="text-slate-600 text-sm">
                  Detailed statistics on engagement, karma, and post performance
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">Responsive Design</h3>
                <p className="text-slate-600 text-sm">
                  Works seamlessly on desktop, tablet, and mobile devices
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack Section */}
        <div className="card p-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Built With</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Next.js 14', icon: '▲' },
              { name: 'React 18', icon: '⚛' },
              { name: 'TypeScript', icon: '📘' },
              { name: 'Tailwind CSS', icon: '🎨' },
              { name: 'Recharts', icon: '📊' },
              { name: 'Sigma.js', icon: '🔗' },
              { name: 'React Query', icon: '⚡' },
              { name: 'Axios', icon: '🌐' },
            ].map((tech) => (
              <div key={tech.name} className="card p-4 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">{tech.icon}</div>
                <p className="font-semibold text-slate-900 text-sm">{tech.name}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
