/**
 * Nexus Agent Flow — Full Demo
 *
 * Demonstrates the complete agent lifecycle using the Nexus SDK pattern:
 *   1. Create session → 2. Check chains → 3. Run transactions →
 *   4. Review approvals → 5. Check history → 6. View stats
 *
 * Usage:
 *   API_KEY=nx_your_key node test-agent.mjs
 *
 * Generate an API key: Dashboard → Settings → API Keys → Generate Key
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('Missing API_KEY. Set it via environment variable:');
  console.error('  API_KEY=nx_your_key_here node test-agent.mjs');
  console.error('\nGenerate one from the dashboard: Settings → API Keys');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
};

async function api(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

function fmt(addr) {
  return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : '—';
}

async function run() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║        NEXUS AGENT FLOW DEMONSTRATION        ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── Step 1: Discover available chains ──
  console.log('─── Step 1: Discover Chains ───');
  const chains = await api('GET', '/api/chains');
  for (const c of chains) {
    const tokens = c.tokens?.map((t) => t.symbol).join(', ') || 'none';
    console.log(`  ${c.display_name} (${c.id}) — tokens: ${tokens}`);
  }

  // ── Step 2: Create agent session ──
  console.log('\n─── Step 2: Create Agent Session ───');
  const session = await api('POST', '/api/sessions', {
    agent_name: 'Demo-Agent',
    daily_limit: 100,
    per_tx_limit: 15,
    allowed_chains: ['base'],
  });
  console.log(`  Session:  ${session.id.slice(0, 8)}...`);
  console.log(`  Wallet:   ${fmt(session.wallet_address)}`);
  console.log(`  Limits:   $${session.per_tx_limit}/tx, $${session.daily_limit}/day`);
  console.log(`  Chains:   ${session.allowed_chains.join(', ')}`);

  // ── Step 3: Run transactions ──
  console.log('\n─── Step 3: Transaction Flow ───');
  const dest = '0x' + 'ab'.repeat(20);

  // 3a. Small transaction → auto-approve
  console.log('\n  [TX-1] $5 USDC to ' + fmt(dest));
  const tx1 = await api('POST', '/api/transactions/propose', {
    session_id: session.id,
    amount: 5,
    destination_address: dest,
    chain: 'base',
    token: 'USDC',
  });
  console.log(`    Result: ${tx1.status}`);
  console.log(`    TX Hash: ${tx1.tx_hash?.slice(0, 18)}...`);
  console.log(`    Spend: $${tx1.spend_today} / $${tx1.daily_limit}`);

  // 3b. Medium transaction → auto-approve
  console.log('\n  [TX-2] $8 USDC');
  const tx2 = await api('POST', '/api/transactions/propose', {
    session_id: session.id,
    amount: 8,
    destination_address: dest,
    chain: 'base',
    token: 'USDC',
  });
  console.log(`    Result: ${tx2.status} | Spend: $${tx2.spend_today}`);

  // 3c. Over per-tx limit → HOLD
  console.log('\n  [TX-3] $20 USDC (exceeds $15 per-tx limit)');
  const tx3 = await api('POST', '/api/transactions/propose', {
    session_id: session.id,
    amount: 20,
    destination_address: dest,
    chain: 'base',
    token: 'USDC',
  });
  console.log(`    Result: ${tx3.status}`);
  console.log(`    Reason: ${tx3.reason}`);
  console.log(`    Approval ID: ${tx3.approval_id?.slice(0, 8)}...`);

  // ── Step 4: Resolve pending approval ──
  console.log('\n─── Step 4: Approval Resolution ───');
  const pending = await api('GET', '/api/approvals?status=pending');
  console.log(`  Pending approvals: ${pending.length}`);
  if (pending.length > 0) {
    const a = pending[0];
    console.log(`  Approving: $${a.amount} → ${fmt(a.destination_address)}`);
    const resolved = await api('PATCH', `/api/approvals/${a.id}`, { action: 'approve' });
    console.log(`  Resolved: ${resolved.status}`);
  }

  // ── Step 5: Transaction history ──
  console.log('\n─── Step 5: Transaction History ───');
  const history = await api('GET', `/api/transactions/history?session_id=${session.id}`);
  console.log(`  Total: ${history.transactions.length} transactions`);
  for (const tx of history.transactions) {
    const hash = tx.tx_hash ? tx.tx_hash.slice(0, 12) + '...' : 'no-hash';
    console.log(
      `  ${tx.outcome.padEnd(8)} $${Number(tx.amount).toFixed(2).padStart(6)} ${tx.chain_id}/${tx.token}  ${hash}`,
    );
  }

  // ── Step 6: Session management ──
  console.log('\n─── Step 6: Session Management ───');
  console.log('  Pausing session...');
  await api('PATCH', `/api/sessions/${session.id}`, { status: 'paused' });
  console.log('  Resuming session...');
  await api('PATCH', `/api/sessions/${session.id}`, { status: 'active' });
  const updated = await api('GET', `/api/sessions/${session.id}`);
  console.log(`  Status: ${updated.status} | Spend: $${Number(updated.spend_today).toFixed(2)}`);

  // ── Step 7: Observability ──
  console.log('\n─── Step 7: Observability ───');
  const stats = await api('GET', '/api/stats?hours=1');
  console.log(`  API calls:   ${stats.api.total_calls} (avg ${stats.api.avg_latency_ms}ms)`);
  console.log(`  Transactions: ${stats.transactions.total} ($${stats.transactions.volume_usd} volume)`);
  console.log(`  Sessions:    ${stats.sessions.total} total, ${stats.sessions.active} active`);

  // ── Step 8: Audit trail ──
  console.log('\n─── Step 8: Audit Trail ───');
  const audit = await api('GET', '/api/audit?limit=5');
  for (const e of audit.entries) {
    const time = new Date(e.created_at).toLocaleTimeString();
    console.log(`  ${time}  ${e.action.padEnd(22)} ${e.resource_type.padEnd(12)} ${e.outcome}`);
  }

  // ── Done ──
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║              DEMO COMPLETE                    ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  3 transactions: 2 approved, 1 held → approved║');
  console.log('║  Session lifecycle: create → pause → resume   ║');
  console.log('║  Full audit trail and observability           ║');
  console.log('╚══════════════════════════════════════════════╝');
}

run().catch((e) => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
