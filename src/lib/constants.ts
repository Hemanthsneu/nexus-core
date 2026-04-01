// ===== TYPES (inline) =====
type ChainConfig = {
  id: string; name: string; family: string; chainId?: number;
  finality: string; phase: string; color: string; rpcUrls: string[];
  blockExplorer: string; nativeToken: string; avgBlockTime: number;
};

type PricingTier = {
  name: string; price: string; period: string; transactionFee: string;
  mau: string; features: string[]; cta: string; highlighted?: boolean;
};

type ArchitectureLayer = {
  id: string; name: string; color: string; bg: string;
  description: string;
  components: { name: string; desc: string }[];
};

// ===== SUPPORTED CHAINS =====
export const CHAINS: ChainConfig[] = [
    { id: 'base', name: 'Base', family: 'evm', chainId: 8453, finality: '~2 sec', phase: 'P0', color: '#0052FF', rpcUrls: ['https://mainnet.base.org'], blockExplorer: 'https://basescan.org', nativeToken: 'ETH', avgBlockTime: 2 },
    { id: 'ethereum', name: 'Ethereum', family: 'evm', chainId: 1, finality: '~13 min', phase: 'P0', color: '#627EEA', rpcUrls: ['https://eth.llamarpc.com'], blockExplorer: 'https://etherscan.io', nativeToken: 'ETH', avgBlockTime: 12 },
    { id: 'polygon', name: 'Polygon', family: 'evm', chainId: 137, finality: '~2 min', phase: 'P0', color: '#8247E5', rpcUrls: ['https://polygon-rpc.com'], blockExplorer: 'https://polygonscan.com', nativeToken: 'MATIC', avgBlockTime: 2 },
    { id: 'arbitrum', name: 'Arbitrum', family: 'evm', chainId: 42161, finality: '~10 min', phase: 'P0', color: '#28A0F0', rpcUrls: ['https://arb1.arbitrum.io/rpc'], blockExplorer: 'https://arbiscan.io', nativeToken: 'ETH', avgBlockTime: 0.25 },
    { id: 'solana', name: 'Solana', family: 'solana', finality: '~400ms', phase: 'P0', color: '#14F195', rpcUrls: ['https://api.mainnet-beta.solana.com'], blockExplorer: 'https://solscan.io', nativeToken: 'SOL', avgBlockTime: 0.4 },
    { id: 'optimism', name: 'Optimism', family: 'evm', chainId: 10, finality: '~2 sec', phase: 'P1', color: '#FF0420', rpcUrls: ['https://mainnet.optimism.io'], blockExplorer: 'https://optimistic.etherscan.io', nativeToken: 'ETH', avgBlockTime: 2 },
    { id: 'bsc', name: 'BNB Chain', family: 'evm', chainId: 56, finality: '~3 sec', phase: 'P1', color: '#F0B90B', rpcUrls: ['https://bsc-dataseed.binance.org'], blockExplorer: 'https://bscscan.com', nativeToken: 'BNB', avgBlockTime: 3 },
    { id: 'avalanche', name: 'Avalanche', family: 'evm', chainId: 43114, finality: '~2 sec', phase: 'P1', color: '#E84142', rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'], blockExplorer: 'https://snowtrace.io', nativeToken: 'AVAX', avgBlockTime: 2 },
    { id: 'tron', name: 'TRON', family: 'custom', finality: '~3 sec', phase: 'P1', color: '#FF060A', rpcUrls: ['https://api.trongrid.io'], blockExplorer: 'https://tronscan.org', nativeToken: 'TRX', avgBlockTime: 3 },
    { id: 'cosmos', name: 'Cosmos', family: 'cosmos', finality: '~6 sec', phase: 'P2', color: '#2E3148', rpcUrls: ['https://rpc.cosmos.network'], blockExplorer: 'https://www.mintscan.io', nativeToken: 'ATOM', avgBlockTime: 6 },
    { id: 'sui', name: 'Sui', family: 'move', finality: '~400ms', phase: 'P2', color: '#4DA2FF', rpcUrls: ['https://fullnode.mainnet.sui.io'], blockExplorer: 'https://suiscan.xyz', nativeToken: 'SUI', avgBlockTime: 0.4 },
    { id: 'aptos', name: 'Aptos', family: 'move', finality: '~1 sec', phase: 'P2', color: '#2DD8A3', rpcUrls: ['https://fullnode.mainnet.aptoslabs.com'], blockExplorer: 'https://aptoscan.com', nativeToken: 'APT', avgBlockTime: 1 },
    { id: 'ton', name: 'TON', family: 'custom', finality: '~5 sec', phase: 'P3', color: '#0098EA', rpcUrls: ['https://toncenter.com/api/v2/jsonRPC'], blockExplorer: 'https://tonscan.org', nativeToken: 'TON', avgBlockTime: 5 },
];

// ===== PRICING TIERS =====
export const PRICING_TIERS: PricingTier[] = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        transactionFee: '1.0%',
        mau: '0 – 500 MAU',
        features: [
            'Up to 500 monthly active users',
            'Basic REST API access',
            '3 chains (Base, Polygon, Ethereum)',
            'Sandbox environment',
            'Community support',
            'Basic analytics dashboard',
        ],
        cta: 'Start Building',
    },
    {
        name: 'Growth',
        price: '$99',
        period: '/month',
        transactionFee: '0.5%',
        mau: '500 – 5,000 MAU',
        features: [
            'Up to 5,000 monthly active users',
            'All P0 + P1 chains (9 chains)',
            'Cross-chain bridging',
            'Webhook delivery',
            'Compliance screening (Tier 0-2)',
            'Priority email support',
            'Advanced analytics',
        ],
        cta: 'Start Free Trial',
    },
    {
        name: 'Scale',
        price: '$499',
        period: '/month',
        transactionFee: '0.3%',
        mau: '5,000 – 50,000 MAU',
        features: [
            'Up to 50,000 monthly active users',
            'All 14 supported chains',
            'AI Agent payments',
            'Full compliance suite (Tier 0-3)',
            'Custom checkout branding',
            'GraphQL API + WebSocket streams',
            'SSO & team management',
            'Dedicated support channel',
        ],
        highlighted: true,
        cta: 'Start Free Trial',
    },
    {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        transactionFee: '0.1 – 0.2%',
        mau: 'Unlimited',
        features: [
            'Unlimited monthly active users',
            'Custom chain deployments',
            'White-label checkout',
            'Custom settlement schedules',
            'Multi-sig merchant accounts',
            'Dedicated infrastructure',
            'SLA guarantees (99.95%)',
            'SOC 2 compliance reports',
            '24/7 premium support + SLA',
        ],
        cta: 'Contact Sales',
    },
];

// ===== ARCHITECTURE LAYERS =====
export const ARCHITECTURE_LAYERS: ArchitectureLayer[] = [
    {
        id: 'l6', name: 'L6: Experience', color: '#10B981', bg: '#052e16',
        description: 'End-user and merchant-facing UI components, analytics, transaction tracking',
        components: [
            { name: 'PayButton', desc: 'One-click payment trigger with wallet connection, amount display, chain selection. Headless-capable.' },
            { name: 'CheckoutModal', desc: 'Full checkout flow: amount, payment method, KYC gate, confirmation, redirect.' },
            { name: 'TxStatus', desc: 'Real-time payment progress with chain confirmations, ETA, explorer deeplinks.' },
            { name: 'AgentDashboard', desc: 'Agent session CRUD, spending analytics, high-value transaction approval queue.' },
            { name: 'MerchantPortal', desc: 'Analytics, settlement management, API key rotation, team RBAC, webhook config.' },
        ],
    },
    {
        id: 'l5', name: 'L5: Application', color: '#8B5CF6', bg: '#1e1145',
        description: 'Developer-facing interfaces, real-time subscriptions, client libraries',
        components: [
            { name: 'REST API (Hono)', desc: 'Resource-oriented API: /payments, /agents, /merchants, /routes. Ed25519 auth.' },
            { name: 'GraphQL', desc: 'Complex queries for dashboard: nested payment data, analytics, compliance summaries.' },
            { name: 'WebSocket Stream', desc: 'Real-time payment status push. Per-payment and per-merchant channels.' },
            { name: 'TypeScript SDK', desc: 'Reference client: NexusClient class, PayButton React component. 5-min integration.' },
            { name: 'Multi-lang SDKs', desc: 'Auto-generated from OpenAPI spec. Python, Go, Rust. Type-safe. Async-first.' },
        ],
    },
    {
        id: 'l4', name: 'L4: Integration', color: '#F59E0B', bg: '#451a03',
        description: 'External system integration, fiat on/off ramp, cross-chain bridging',
        components: [
            { name: 'Fiat Rails', desc: 'Stripe Crypto Onramp (primary), MoonPay, Transak. Geographic routing.' },
            { name: 'Bridge Connectors', desc: 'LI.FI aggregator (30+ bridges), Across Protocol for high-volume corridors.' },
            { name: 'DEX Aggregator', desc: '1inch Fusion+ (EVM), Jupiter (Solana). Best-price execution with MEV protection.' },
            { name: 'CEX Connectors', desc: 'Coinbase, Binance APIs for institutional settlement and deep liquidity.' },
            { name: 'Settlement Partner', desc: 'Zero Hash: 49 US states + BitLicense. Stablecoin issuance/redemption.' },
        ],
    },
    {
        id: 'l3', name: 'L3: Compliance', color: '#EF4444', bg: '#450a0a',
        description: 'Identity verification, transaction monitoring, regulatory reporting',
        components: [
            { name: 'KYC Gateway', desc: 'Sumsub + Jumio fallback. 4-tier progressive model. <30s automated verification.' },
            { name: 'AML Scanner', desc: 'TRM Labs real-time monitoring. Pattern analysis. VASP identification. <200ms/tx.' },
            { name: 'Sanctions Screener', desc: 'Dual-provider (TRM + Chainalysis). OFAC, EU, UN, UK HMT. <100ms.' },
            { name: 'Travel Rule Engine', desc: 'Notabene integration. FATF compliance for transfers >$3K.' },
            { name: 'Risk Scoring ML', desc: 'Custom model: on-chain + behavioral + counterparty risk. Score 0-100. <50ms.' },
        ],
    },
    {
        id: 'l2', name: 'L2: Intelligence', color: '#06B6D4', bg: '#042f2e',
        description: 'Optimal path computation, cost minimization, frontrunning protection',
        components: [
            { name: 'Route Optimizer', desc: 'Weighted directed graph with Pareto-optimal frontier. Cheapest/fastest/reliable.' },
            { name: 'Fee Estimator', desc: 'EIP-1559 gas prediction, bridge fees, swap slippage, fiat costs. Real-time.' },
            { name: 'MEV Shield', desc: 'Flashbots (L1), private mempools (L2), Jito bundles (Solana). Oracle enforcement.' },
            { name: 'Liquidity Aggregator', desc: 'Multi-source: 1inch + Paraswap + 0x (EVM), Jupiter (Solana). Best execution.' },
        ],
    },
    {
        id: 'l1', name: 'L1: Protocol Core', color: '#EC4899', bg: '#500724',
        description: 'Payment lifecycle management, state transitions, atomic settlement',
        components: [
            { name: 'Payment Engine', desc: 'UPO lifecycle. Event-sourced aggregate. Saga orchestrator for multi-leg payments.' },
            { name: 'State Machine', desc: '14 states, formally verified. Deterministic path. Timeout-driven recovery.' },
            { name: 'Settlement Manager', desc: '4 modes: Instant, Batched, Escrow, Streaming (Superfluid). Atomic settlement.' },
            { name: 'Smart Contracts', desc: 'NexusRouter (EIP-2535), EscrowVault, AgentVault, PaymentChannel. Multi-sig gov.' },
        ],
    },
    {
        id: 'l0', name: 'L0: Chain Substrate', color: '#64748B', bg: '#0f172a',
        description: 'Raw blockchain interaction, transaction submission, confirmation tracking',
        components: [
            { name: 'EVM Adapter (viem)', desc: '15+ chains. Multi-RPC failover. EIP-1559 gas. Reorg detection. Redis nonce pool.' },
            { name: 'Solana Adapter', desc: '@solana/web3.js v2. Helius RPC. Priority fees. Versioned txs. Durable nonces.' },
            { name: 'Cosmos Adapter', desc: 'CosmJS. IBC cross-chain. Tendermint RPC. Osmosis, Noble (USDC native).' },
            { name: 'Move Adapter', desc: 'Sui SDK + Aptos SDK. Object/resource models. Sub-second finality.' },
            { name: 'Block Indexer', desc: 'Per-chain Rust indexer: blocks, confirmations, events → Kafka topic.' },
        ],
    },
];

// ===== PAYMENT STATE CONFIG =====
export const PAYMENT_STATE_CONFIG = [
    { state: 'CREATED' as const, label: 'Created', color: '#64748B', icon: '○', description: 'Payment intent received' },
    { state: 'COMPLIANCE_CHECK' as const, label: 'Compliance Check', color: '#F59E0B', icon: '◎', description: 'KYC/AML screening' },
    { state: 'COMPLIANCE_HOLD' as const, label: 'Compliance Hold', color: '#EF4444', icon: '⊘', description: 'Manual review required' },
    { state: 'CLEARED' as const, label: 'Cleared', color: '#10B981', icon: '◉', description: 'Compliance passed' },
    { state: 'ROUTE_COMPUTED' as const, label: 'Route Ready', color: '#8B5CF6', icon: '◈', description: 'Optimal path computed' },
    { state: 'EXECUTING' as const, label: 'Executing', color: '#06B6D4', icon: '⟳', description: 'Transactions in progress' },
    { state: 'LEG_CONFIRMED' as const, label: 'Leg Confirmed', color: '#06B6D4', icon: '◇', description: 'Tx confirmed on-chain' },
    { state: 'SETTLING' as const, label: 'Settling', color: '#EC4899', icon: '⊕', description: 'Final settlement' },
    { state: 'SETTLED' as const, label: 'Settled', color: '#10B981', icon: '●', description: 'Payment complete', terminal: true },
    { state: 'FAILED' as const, label: 'Failed', color: '#EF4444', icon: '✕', description: 'Unrecoverable failure', terminal: true },
    { state: 'EXPIRED' as const, label: 'Expired', color: '#64748B', icon: '⏉', description: 'TTL exceeded', terminal: true },
    { state: 'CANCELLED' as const, label: 'Cancelled', color: '#64748B', icon: '⊖', description: 'User cancelled', terminal: true },
];

// ===== TECH STACK =====
export const TECH_STACK = [
    { category: 'Backend', items: ['TypeScript (Node.js 22)', 'Hono (API Framework)', 'Rust (Performance-critical)'] },
    { category: 'Smart Contracts', items: ['Solidity 0.8.24+ (Foundry)', 'Rust/Anchor (Solana)', 'EIP-2535 Diamond Proxy'] },
    { category: 'Frontend', items: ['Next.js 15 (App Router)', 'React 19', 'TailwindCSS'] },
    { category: 'Blockchain', items: ['viem 2.x (EVM)', '@solana/web3.js v2', 'ZeroDev Kernel v3'] },
    { category: 'Data', items: ['PostgreSQL 16 (Supabase)', 'Confluent Kafka', 'ClickHouse Cloud', 'Upstash Redis'] },
    { category: 'Compliance', items: ['Sumsub (KYC)', 'TRM Labs (AML)', 'Chainalysis', 'Notabene (Travel Rule)'] },
    { category: 'Infrastructure', items: ['AWS ECS Fargate', 'Pulumi (IaC)', 'Datadog', 'GitHub Actions'] },
    { category: 'Integrations', items: ['LI.FI + Across (Bridges)', '1inch + Jupiter (DEX)', 'Stripe + MoonPay (Fiat)'] },
];

// ===== COMPARISON DATA =====
export const COMPETITOR_COMPARISON = [
    { feature: 'Self-Service Integration', nexus: true, halliday: false, moonpay: true, thirdweb: true },
    { feature: 'Non-Custodial Architecture', nexus: true, halliday: false, moonpay: false, thirdweb: true },
    { feature: 'AI Agent Payments', nexus: true, halliday: false, moonpay: false, thirdweb: false },
    { feature: 'Compliance Built-In', nexus: true, halliday: false, moonpay: true, thirdweb: false },
    { feature: 'Cross-Chain Routing', nexus: true, halliday: true, moonpay: false, thirdweb: true },
    { feature: 'Formal State Machine Verification', nexus: true, halliday: false, moonpay: false, thirdweb: false },
    { feature: 'Event Sourcing / Full Audit Trail', nexus: true, halliday: false, moonpay: false, thirdweb: false },
    { feature: '4 Settlement Modes', nexus: true, halliday: false, moonpay: false, thirdweb: false },
    { feature: 'Transparent Public Pricing', nexus: true, halliday: false, moonpay: true, thirdweb: true },
    { feature: 'Solana + EVM + Move Support', nexus: true, halliday: false, moonpay: false, thirdweb: true },
];

// ===== STATS =====
export const PLATFORM_STATS = [
    { label: 'Supported Chains', value: '14', suffix: '' },
    { label: 'Architecture Layers', value: '7', suffix: '' },
    { label: 'Payment States', value: '14', suffix: '' },
    { label: 'Integration Lines', value: '6', suffix: '' },
];
