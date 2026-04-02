/**
 * Chain adapter interface.
 * Each supported chain implements this contract. New chains are added
 * by creating a new adapter file — no existing code changes.
 *
 * Phase 4 extends this with on-chain enforcement methods.
 */
export interface ChainAdapter {
  readonly chainId: string;
  readonly displayName: string;
  readonly nativeToken: string;

  /** Generate a new wallet/address for an agent session. */
  generateWallet(): Promise<WalletInfo>;

  /** Validate that a destination address is well-formed for this chain. */
  validateAddress(address: string): boolean;

  /**
   * Execute an on-chain transfer. Returns a tx hash on success.
   * Phase 2: returns a mock hash (off-chain settlement).
   * Phase 4: executes real on-chain transfer via AgentVault.
   */
  transfer(params: TransferParams): Promise<TransferResult>;

  /** Get the explorer URL for a transaction hash. */
  explorerUrl(txHash: string): string;
}

export type WalletInfo = {
  address: string;
  /** Opaque key material — encrypted at rest in Phase 3+. */
  privateKey?: string;
};

export type TransferParams = {
  from: string;
  to: string;
  token: string;
  amount: number;
};

export type TransferResult = {
  txHash: string;
  status: 'submitted' | 'confirmed' | 'simulated';
};

export type ChainConfig = {
  id: string;
  display_name: string;
  native_token: string;
  rpc_url: string | null;
  explorer_url: string | null;
  is_testnet: boolean;
  enabled: boolean;
};

export type TokenConfig = {
  chain_id: string;
  symbol: string;
  contract_address: string | null;
  decimals: number;
  enabled: boolean;
};
