import { TokenSentiment } from '@moltbeat/crypto-intel'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TrendingTokensProps {
  tokens: TokenSentiment[]
}

function getSentimentIcon(trend: string) {
  if (trend === 'bullish') return <TrendingUp className="h-5 w-5 text-green-400" />
  if (trend === 'bearish') return <TrendingDown className="h-5 w-5 text-red-400" />
  return <Minus className="h-5 w-5 text-yellow-400" />
}

export default function TrendingTokens({ tokens }: TrendingTokensProps) {
  return (
    <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold text-white">
        🔥 Trending Tokens
      </h2>
      <div className="space-y-3">
        {tokens.map((token) => (
          <div
            key={token.token}
            className="flex items-center justify-between rounded-lg bg-white/5 p-4 transition hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-200">
                {token.token}
              </div>
              <div>
                <p className="font-semibold text-white">{token.token}</p>
                <p className="text-sm text-purple-300">
                  {token.mentions} mentions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getSentimentIcon(token.sentimentTrend)}
              <span
                className={`font-semibold ${
                  token.sentimentTrend === 'bullish'
                    ? 'text-green-400'
                    : token.sentimentTrend === 'bearish'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                }`}
              >
                {token.sentimentTrend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
