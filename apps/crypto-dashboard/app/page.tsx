import { prisma } from '@moltbeat/database'
import { CryptoIntelligence } from '@moltbeat/crypto-intel'
import MarketSentiment from '@/components/MarketSentiment'
import TrendingTokens from '@/components/TrendingTokens'
import TopInfluencers from '@/components/TopInfluencers'
import WhaleAlerts from '@/components/WhaleAlerts'
import BreakingTrends from '@/components/BreakingTrends'

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic'
export const revalidate = 300 // Revalidate every 5 minutes

export default async function Home() {
  const cryptoIntel = new CryptoIntelligence(prisma)

  // Generate crypto intelligence report
  const report = await cryptoIntel.generateReport(7)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-3 text-5xl font-bold text-white">
            🪙 Crypto Intelligence
          </h1>
          <p className="text-xl text-purple-200">
            Real-time sentiment analysis from MoltBook
          </p>
          <p className="mt-2 text-sm text-purple-300">
            Last 7 days • Updated every 5 minutes
          </p>
        </header>

        {/* Market Sentiment Overview */}
        <MarketSentiment sentiment={report.marketSentiment} />

        {/* Breaking Trends */}
        {report.breakingTrends.length > 0 && (
          <BreakingTrends trends={report.breakingTrends} />
        )}

        {/* Grid Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trending Tokens */}
          <TrendingTokens tokens={report.topTokens.slice(0, 8)} />

          {/* Top Influencers */}
          <TopInfluencers influencers={report.topInfluencers.slice(0, 8)} />
        </div>

        {/* Whale Activity */}
        <WhaleAlerts alerts={report.whaleAlerts} />

        {/* Footer */}
        <footer className="mt-12 text-center text-purple-300">
          <p className="text-sm">
            Powered by <span className="font-semibold">MoltBeat Analytics</span>
          </p>
        </footer>
      </div>
    </main>
  )
}
