const API_URL = 'http://localhost:3001/api';

async function testAgentFlow() {
  console.log('Starting Nexus Agent Session Simulation...\n');

  // 1. Create a Session
  console.log('1. Initiating new Agent Session...');
  const sessionRes = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ daily_limit: 100, per_tx_limit: 20, agent_name: 'Test-Agent' })
  });
  const session = await sessionRes.json();
  console.log(`   Session Created: ${session.id}`);
  console.log(`   Wallet: ${session.wallet_address}\n`);

  // 2. Propose a Valid Transaction ($5)
  console.log('2. Agent proposes a valid transaction ($5)...');
  const validTx = await fetch(`${API_URL}/transactions/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
