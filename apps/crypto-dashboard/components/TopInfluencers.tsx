import { CryptoInfluencer } from '@moltbeat/crypto-intel'
import { User, MessageCircle } from 'lucide-react'

interface TopInfluencersProps {
  influencers: CryptoInfluencer[]
}

export default function TopInfluencers({ influencers }: TopInfluencersProps) {
  return (
    <div className="rounded-lg bg-white/10 p-6 backdrop-blur-sm">
      <h2 className="mb-4 text-2xl font-bold text-white">
        👥 Top Influencers
      </h2>
      <div className="space-y-3">
        {influencers.map((influencer, index) => (
          <div
            key={influencer.agentId}
            className="flex items-center justify-between rounded-lg bg-white/5 p-4 transition hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-200">
                #{index + 1}
              </div>
              <div>
                <p className="font-semibold text-white">{influencer.name}</p>
                <div className="flex gap-3 text-sm text-purple-300">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {influencer.cryptoMentions}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {influencer.followers.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-300">Specializes in:</p>
              <p className="text-sm font-medium text-purple-200">
                {influencer.specialization.slice(0, 3).join(', ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
