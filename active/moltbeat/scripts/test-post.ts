/**
 * Test Post Script
 * Creates a test post to verify agent configuration
 *
 * Usage: npx tsx scripts/test-post.ts <agent-name>
 * Example: npx tsx scripts/test-post.ts TechNewsBot
 */

import { MoltBookClient } from '../packages/moltbook-client/src/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AGENT_KEYS: Record<string, string | undefined> = {
  TechNewsBot: process.env.TECHNEWSBOT_API_KEY,
  CryptoAnalyst: process.env.CRYPTOANALYST_API_KEY,
  StartupScout: process.env.STARTUPSCOUT_API_KEY,
  AIResearcher: process.env.AIRESEARCHER_API_KEY,
};

/**
 * Test submolts (communities)
 */
const TEST_SUBMOLTS = ['general', 'ai', 'startups', 'crypto'];

/**
 * Main test function
 */
async function main() {
  const agentName = process.argv[2];

  if (!agentName) {
    console.error('Usage: npx tsx scripts/test-post.ts <agent-name>');
    console.error('\nAvailable agents:');
    Object.keys(AGENT_KEYS).forEach((name) => console.error(`  - ${name}`));
    process.exit(1);
  }

  const apiKey = AGENT_KEYS[agentName];

  if (!apiKey) {
    console.error(`❌ Agent '${agentName}' not found or no API key configured.`);
    console.error('\nAvailable agents:');
    Object.keys(AGENT_KEYS).forEach((name) => console.error(`  - ${name}`));
    process.exit(1);
  }

  console.log(`\n🧪 Testing ${agentName}\n`);

  const client = new MoltBookClient({ apiKey });

  try {
    // Get agent profile
    console.log('1. Fetching agent profile...');
    const agent = await client.getMe();
    console.log(`   ✅ Name: ${agent.name}`);
    console.log(`   ✅ Karma: ${agent.karma}`);
    console.log(`   ✅ Claimed: ${agent.is_claimed ? 'Yes' : 'No'}`);

    if (!agent.is_claimed) {
      console.error('\n❌ Agent not claimed yet!');
      console.error('Run: npx tsx scripts/verify-agents.ts for claim instructions');
      process.exit(1);
    }

    // Check rate limits
    console.log('\n2. Checking rate limits...');
    const rateLimits = client.getRateLimitStatus();
    console.log(`   Can post: ${rateLimits.canPost ? 'Yes' : 'No'}`);
    if (!rateLimits.canPost) {
      console.log(`   Next post in: ${Math.ceil(rateLimits.nextPostIn / 1000 / 60)} minutes`);
    }
    console.log(`   Can comment: ${rateLimits.canComment ? 'Yes' : 'No'}`);
    console.log(`   Comments remaining today: ${rateLimits.commentsRemainingToday}`);

    // List available submolts
    console.log('\n3. Listing available submolts...');
    const submolts = await client.getSubmolts();
    console.log(`   Found ${submolts.length} communities`);
    console.log(`   Top 5: ${submolts.slice(0, 5).map(s => s.name).join(', ')}`);

    // Create test post (if allowed)
    if (rateLimits.canPost) {
      console.log('\n4. Creating test post...');

      const testSubmolt = submolts.find((s) => TEST_SUBMOLTS.includes(s.name))?.name || 'general';

      const post = await client.createPost({
        submolt: testSubmolt,
        title: `🧪 Test post from ${agentName}`,
        content: `This is a test post from the MoltBeat platform. If you're seeing this, the agent is configured correctly!

Testing:
- ✅ Authentication
- ✅ Rate limiting
- ✅ Post creation

Powered by MoltBeat - Analytics for MoltBook
https://github.com/your-username/moltbeat`,
      });

      console.log(`   ✅ Post created!`);
      console.log(`   Post ID: ${post.id}`);
      console.log(`   Submolt: ${post.submolt.name}`);
      console.log(`   URL: https://www.moltbook.com/posts/${post.id}`);

      // Update rate limit status
      const newLimits = client.getRateLimitStatus();
      console.log(`\n   Next post allowed in: ${Math.ceil(newLimits.nextPostIn / 1000 / 60)} minutes`);
    } else {
      console.log('\n4. ⏳ Skipping test post (rate limit cooldown)');
      console.log(`   Next post allowed in: ${Math.ceil(rateLimits.nextPostIn / 1000 / 60)} minutes`);
    }

    console.log('\n✅ All tests passed! Agent is ready to use.\n');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.hint) {
      console.error(`   Hint: ${error.hint}`);
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
