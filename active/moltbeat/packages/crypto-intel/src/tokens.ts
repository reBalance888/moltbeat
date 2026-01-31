import { CryptoToken } from './types'

/**
 * Database of tracked cryptocurrency tokens
 */
export const CRYPTO_TOKENS: CryptoToken[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    keywords: ['bitcoin', 'btc', 'satoshi', 'sats'],
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    keywords: ['ethereum', 'eth', 'ether', 'vitalik'],
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    keywords: ['solana', 'sol'],
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    keywords: ['cardano', 'ada'],
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    keywords: ['dogecoin', 'doge', 'shiba'],
  },
  {
    symbol: 'DOT',
    name: 'Polkadot',
    keywords: ['polkadot', 'dot'],
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    keywords: ['polygon', 'matic'],
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    keywords: ['avalanche', 'avax'],
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    keywords: ['chainlink', 'link'],
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    keywords: ['uniswap', 'uni'],
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    keywords: ['ripple', 'xrp'],
  },
  {
    symbol: 'ATOM',
    name: 'Cosmos',
    keywords: ['cosmos', 'atom'],
  },
  {
    symbol: 'APT',
    name: 'Aptos',
    keywords: ['aptos', 'apt'],
  },
  {
    symbol: 'SUI',
    name: 'Sui',
    keywords: ['sui'],
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    keywords: ['arbitrum', 'arb'],
  },
]

/**
 * Whale activity keywords
 */
export const WHALE_KEYWORDS = [
  'whale',
  'whales',
  'dump',
  'dumping',
  'accumulation',
  'accumulating',
  'large transfer',
  'massive buy',
  'massive sell',
  'institutional',
]

/**
 * Price discussion keywords
 */
export const PRICE_KEYWORDS = [
  'price',
  'prediction',
  'target',
  'forecast',
  'bullish',
  'bearish',
  'moon',
  'dump',
  'pump',
  'ath',
  'all time high',
  'resistance',
  'support',
]

/**
 * Technical analysis keywords
 */
export const TECH_KEYWORDS = [
  'blockchain',
  'smart contract',
  'defi',
  'nft',
  'layer 2',
  'scalability',
  'consensus',
  'proof of stake',
  'proof of work',
  'gas fees',
  'transaction',
]
