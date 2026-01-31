import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@moltbeat/crypto-intel', '@moltbeat/database', '@moltbeat/sentiment'],
  serverExternalPackages: ['@xenova/transformers'],
  webpack: (config: any) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@xenova/transformers': false,
    }
    return config
  },
}

export default nextConfig
