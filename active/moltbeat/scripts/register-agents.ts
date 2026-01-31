/**
 * Agent Registration Script
 * Registers MoltBeat agents with MoltBook API
 *
 * Usage: npx tsx scripts/register-agents.ts
 */

import { MOLTBOOK_CONFIG } from '../packages/moltbook-client/src/config';

interface RegistrationResult {
  apiKey: string;
  claimUrl: string;
  verificationCode: string;
}

/**
 * Register a single agent with MoltBook
 */
async function registerAgent(name: string, description: string): Promise<RegistrationResult> {
  const response = await fetch(`${MOLTBOOK_CONFIG.baseUrl}/agents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, description }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Registration failed: ${data.error || response.statusText}`);
  }

  return {
    apiKey: data.agent.api_key,
    claimUrl: data.agent.claim_url,
    verificationCode: data.agent.verification_code,
  };
}

/**
 * MoltBeat Agent Definitions
 */
const AGENTS = [
  {
    name: 'TechNewsBot',
    description:
      'AI-powered tech news curator. Shares insights on startups, AI breakthroughs, and developer tools. Focuses on emerging technologies and industry trends.',
    envKey: 'TECHNEWSBOT_API_KEY',
  },
  {
    name: 'CryptoAnalyst',
    description:
      'Data-driven cryptocurrency analyst. Tracks sentiment, trends, and market movements in the crypto space. Provides technical analysis and market insights.',
    envKey: 'CRYPTOANALYST_API_KEY',
  },
  {
    name: 'StartupScout',
    description:
      'Startup ecosystem explorer. Covers funding rounds, founder stories, and growth strategies. Highlights innovative early-stage companies and their journeys.',
    envKey: 'STARTUPSCOUT_API_KEY',
  },
  {
    name: 'AIResearcher',
    description:
      'AI/ML research synthesizer. Discusses papers, architectures, and industry advances. Translates complex research into practical insights.',
    envKey: 'AIRESEARCHER_API_KEY',
  },
];

/**
 * Main registration flow
 */
async function main() {
  console.log('🦞 MoltBeat Agent Registration System\n');
  console.log(`Registering ${AGENTS.length} agents with MoltBook API...`);
  console.log(`API URL: ${MOLTBOOK_CONFIG.baseUrl}\n`);

  const results: Array<{
    agent: typeof AGENTS[0];
    result?: RegistrationResult;
    error?: Error;
  }> = [];

  // Register all agents
  for (const agent of AGENTS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Registering: ${agent.name}`);
    console.log(`Description: ${agent.description}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      const result = await registerAgent(agent.name, agent.description);

      console.log(`✅ ${agent.name} registered successfully!\n`);
      console.log(`API Key: ${result.apiKey}`);
      console.log(`Claim URL: ${result.claimUrl}`);
      console.log(`Verification Code: ${result.verificationCode}\n`);

      results.push({ agent, result });
    } catch (error: any) {
      console.error(`❌ Failed to register ${agent.name}:`);
      console.error(`   Error: ${error.message}\n`);
      results.push({ agent, error });
    }

    // Wait a bit between registrations to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 REGISTRATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const successful = results.filter((r) => r.result);
  const failed = results.filter((r) => r.error);

  console.log(`Total: ${AGENTS.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}\n`);

  // Print environment variables for successful registrations
  if (successful.length > 0) {
    console.log('='.repeat(60));
    console.log('🔑 ADD TO .env FILE:');
    console.log('='.repeat(60) + '\n');

    for (const { agent, result } of successful) {
      console.log(`${agent.envKey}=${result!.apiKey}`);
    }

    console.log('\n');

    // Print claim instructions
    console.log('='.repeat(60));
    console.log('⚠️  IMPORTANT: NEXT STEPS FOR CLAIMING AGENTS');
    console.log('='.repeat(60) + '\n');

    console.log('Each agent must be claimed by a human via Twitter verification:\n');

    for (const { agent, result } of successful) {
      console.log(`${agent.name}:`);
      console.log(`  1. Visit: ${result!.claimUrl}`);
      console.log(`  2. Post verification tweet with code: ${result!.verificationCode}`);
      console.log(`  3. Wait for verification (usually instant)`);
      console.log('');
    }

    console.log('After claiming all agents, run: npx tsx scripts/verify-agents.ts');
  }

  // Print failed registrations
  if (failed.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ FAILED REGISTRATIONS:');
    console.log('='.repeat(60) + '\n');

    for (const { agent, error } of failed) {
      console.log(`${agent.name}: ${error!.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Registration process complete!');
  console.log('='.repeat(60) + '\n');

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
