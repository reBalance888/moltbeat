/**
 * Agent Verification Script
 * Verifies that all registered agents are claimed and active
 *
 * Usage: npx tsx scripts/verify-agents.ts
 */

import { MoltBookClient } from '../packages/moltbook-client/src/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AGENT_KEYS = {
  TechNewsBot: process.env.TECHNEWSBOT_API_KEY,
  CryptoAnalyst: process.env.CRYPTOANALYST_API_KEY,
  StartupScout: process.env.STARTUPSCOUT_API_KEY,
  AIResearcher: process.env.AIRESEARCHER_API_KEY,
};

/**
 * Verify a single agent
 */
async function verifyAgent(name: string, apiKey: string): Promise<{
  success: boolean;
  agent?: any;
  error?: string;
}> {
  try {
    const client = new MoltBookClient({ apiKey });

    // Get agent profile
    const agent = await client.getMe();

    // Check if claimed
    if (!agent.is_claimed) {
      return {
        success: false,
        error: 'Agent not claimed yet. Visit claim URL and post verification tweet.',
      };
    }

    return {
      success: true,
      agent,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main verification flow
 */
async function main() {
  console.log('🔍 MoltBeat Agent Verification\n');

  const results: Array<{
    name: string;
    success: boolean;
    agent?: any;
    error?: string;
  }> = [];

  // Verify all agents
  for (const [name, apiKey] of Object.entries(AGENT_KEYS)) {
    console.log(`\nVerifying ${name}...`);

    if (!apiKey) {
      console.log(`  ❌ No API key found in .env (${name.toUpperCase().replace(/[^A-Z]/g, '_')}_API_KEY)`);
      results.push({ name, success: false, error: 'Missing API key' });
      continue;
    }

    const result = await verifyAgent(name, apiKey);

    if (result.success) {
      console.log(`  ✅ Verified and claimed!`);
      console.log(`     Name: ${result.agent.name}`);
      console.log(`     Karma: ${result.agent.karma}`);
      console.log(`     Posts: ${result.agent.stats.posts}`);
      console.log(`     Comments: ${result.agent.stats.comments}`);
      console.log(`     Followers: ${result.agent.follower_count}`);

      if (result.agent.owner) {
        console.log(`     Owner: @${result.agent.owner.x_handle} ${result.agent.owner.x_verified ? '✓' : ''}`);
      }
    } else {
      console.log(`  ❌ ${result.error}`);
    }

    results.push({ name, ...result });

    // Wait a bit to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const verified = results.filter((r) => r.success);
  const unverified = results.filter((r) => !r.success);

  console.log(`Total agents: ${results.length}`);
  console.log(`✅ Verified & Claimed: ${verified.length}`);
  console.log(`❌ Not verified: ${unverified.length}\n`);

  if (verified.length > 0) {
    console.log('Verified agents:');
    for (const { name, agent } of verified) {
      console.log(`  ✅ ${name} (${agent.karma} karma, ${agent.stats.posts} posts)`);
    }
    console.log('');
  }

  if (unverified.length > 0) {
    console.log('Unverified agents:');
    for (const { name, error } of unverified) {
      console.log(`  ❌ ${name}: ${error}`);
    }
    console.log('');
  }

  if (verified.length === results.length) {
    console.log('🎉 All agents verified and ready to use!');
    console.log('\nNext step: Start agent processes with:');
    console.log('  pnpm --filter @moltbeat/agents dev');
  } else {
    console.log('⚠️  Some agents need attention. See errors above.');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(unverified.length > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
