/**
 * Nexus Agent Flow Simulation
 * Usage:
 *   node test-agent.mjs                         # requires API_KEY env var
 *   API_KEY=nx_your_key node test-agent.mjs      # explicit key
 *
 * Generate an API key from the dashboard: Settings → API Keys → Generate Key
 */

const API_URL = 'http://localhost:3001/api';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('Missing API_KEY. Set it via environment variable:');
  console.error('  API_KEY=nx_your_key_here node test-agent.mjs');
  console.error('\nGenerate one from the dashboard: Settings → API Keys → Generate Key');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

async function testAgentFlow() {
  console.log('Starting Nexus Agent Session Simulation...\n');

  // 1. Create a Session
  console.log('1. Initiating new Agent Session...');
  const sessionRes = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ daily_limit: 100, per_tx_limit: 20, agent_name: 'Test-Agent' })
  });
  const session = await sessionRes.json();
  if (sessionRes.status === 401) {
    console.error('   Authentication failed:', session.error);
    process.exit(1);
  }
  console.log(`   Session Created: ${session.id}`);
  console.log(`   Wallet: ${session.wallet_address}\n`);

  // 2. Propose a Valid Transaction ($5)
  console.log('2. Agent proposes a valid transaction ($5)...');
  const validTx = await fetch(`${API_URL}/transactions/propose`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: session.id,
      amount: 5,
      destination_address: '0x1234567890abcdef1234567890abcdef12345678'
    })
  });
  const validResult = await validTx.json();
  console.log(`   Response: ${validResult.status} - ${validResult.message}\n`);

  // 3. Propose a Transaction Over Limit ($25)
  console.log('3. Agent proposes transaction exceeding per-tx limit ($25)...');
  const invalidTx = await fetch(`${API_URL}/transactions/propose`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      session_id: session.id,
      amount: 25,
      destination_address: '0x1234567890abcdef1234567890abcdef12345678'
    })
  });
  const invalidResult = await invalidTx.json();
  console.log(`   Response: ${invalidResult.status} - ${invalidResult.reason}`);
  console.log(`   -> Check your Dashboard Authorization Queue!\n`);
}

testAgentFlow().catch(console.error);
