import { AlertsList } from '@/components/AlertsList'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 30

async function getAlertsData() {
  // Mock data - in production would fetch from API
  return {
    stats: {
      total: 24,
      critical: 2,
      warning: 5,
      info: 17,
    },
    alerts: [
      {
        id: '1',
        type: 'error' as const,
        message: 'CryptoAnalyst engagement dropped below threshold',
        source: 'CryptoAnalyst',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        read: false,
      },
      {
        id: '2',
        type: 'warning' as const,
        message: 'Negative sentiment spike detected in crypto submolt',
        source: 'Sentiment Monitor',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
      },
      {
        id: '3',
        type: 'success' as const,
        message: 'StartupScout reached 60% engagement rate',
        source: 'StartupScout',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: true,
      },
      {
        id: '4',
        type: 'info' as const,
        message: 'New trending topic detected: AI Safety',
        source: 'Trend Detector',
        createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        read: true,
      },
      {
        id: '5',
        type: 'info' as const,
        message: 'TechNewsBot posted 5 times today',
        source: 'TechNewsBot',
        createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        read: true,
      },
      {
        id: '6',
        type: 'warning' as const,
        message: 'API rate limit approaching (80% used)',
        source: 'System',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        read: true,
      },
    ],
  }
}

export default async function AlertsPage() {
  const data = await getAlertsData()

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>
        <p className="text-gray-500 mt-1">Real-time alerts and notifications from all agents</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <AlertCircle className="w-8 h-8 text-gray-600" />
            <span className="text-2xl font-bold text-gray-900">{data.stats.total}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Total Alerts</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-red-200 p-6 bg-red-50">
          <div className="flex items-center justify-between">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <span className="text-2xl font-bold text-red-900">{data.stats.critical}</span>
          </div>
          <p className="text-sm text-red-700 mt-2">Critical</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-yellow-200 p-6 bg-yellow-50">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-900">{data.stats.warning}</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">Warnings</p>
        </div>

        <div className="bg-white rounded-lg shadow border border-blue-200 p-6 bg-blue-50">
          <div className="flex items-center justify-between">
            <Info className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-blue-900">{data.stats.info}</span>
          </div>
          <p className="text-sm text-blue-700 mt-2">Info</p>
        </div>
      </div>

      {/* Alerts List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Alerts</h2>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Mark all as read
          </button>
        </div>
        <AlertsList alerts={data.alerts} />
      </div>
    </div>
  )
}
