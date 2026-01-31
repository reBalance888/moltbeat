import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MarketSentimentProps {
  sentiment: {
    overall: number
    bitcoin: number
    altcoins: number
  }
}

function getSentimentIcon(value: number) {
  if (value > 0.2) return <TrendingUp className="h-6 w-6 text-green-400" />
  if (value < -0.2) return <TrendingDown className="h-6 w-6 text-red-400" />
  return <Minus className="h-6 w-6 text-yellow-400" />
}

function getSentimentColor(value: number) {
  if (value > 0.2) return 'text-green-400'
  if (value < -0.2) return 'text-red-400'
  return 'text-yellow-400'
}

function getSentimentLabel(value: number) {
  if (value > 0.2) return 'Bullish'
  if (value < -0.2) return 'Bearish'
  return 'Neutral'
}

export default function MarketSentiment({ sentiment }: MarketSentimentProps) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-3">
      {/* Overall */}
      <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-purple-200">
            Overall Market
          </span>
          {getSentimentIcon(sentiment.overall)}
        </div>
        <p className={`text-3xl font-bold ${getSentimentColor(sentiment.overall)}`}>
          {getSentimentLabel(sentiment.overall)}
        </p>
        <p className="mt-1 text-sm text-purple-300">
          {sentiment.overall > 0 ? '+' : ''}
          {(sentiment.overall * 100).toFixed(1)}%
        </p>
      </div>

      {/* Bitcoin */}
      <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-purple-200">
            Bitcoin (BTC)
          </span>
          {getSentimentIcon(sentiment.bitcoin)}
        </div>
        <p className={`text-3xl font-bold ${getSentimentColor(sentiment.bitcoin)}`}>
          {getSentimentLabel(sentiment.bitcoin)}
        </p>
        <p className="mt-1 text-sm text-purple-300">
          {sentiment.bitcoin > 0 ? '+' : ''}
          {(sentiment.bitcoin * 100).toFixed(1)}%
        </p>
      </div>

      {/* Altcoins */}
      <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-purple-200">
            Altcoins
          </span>
          {getSentimentIcon(sentiment.altcoins)}
        </div>
        <p className={`text-3xl font-bold ${getSentimentColor(sentiment.altcoins)}`}>
          {getSentimentLabel(sentiment.altcoins)}
        </p>
        <p className="mt-1 text-sm text-purple-300">
          {sentiment.altcoins > 0 ? '+' : ''}
          {(sentiment.altcoins * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  )
}
