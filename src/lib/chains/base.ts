import type { ChainAdapter, WalletInfo, TransferParams, TransferResult } from './types';

/**
 * Base chain adapter.
 * Phase 2: wallet generation is local random, transfers are simulated.
 * Phase 4: this will delegate to Coinbase CDP or AgentVault contracts.
 */
export class BaseAdapter implements ChainAdapter {
  readonly chainId = 'base';
  readonly displayName = 'Base';
  readonly nativeToken = 'ETH';

  async generateWallet(): Promise<WalletInfo> {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    const address = '0x' + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return { address };
  }

  validateAddress(address: string): boolean {
    return /^0x[0-9a-fA-F]{40}$/.test(address);
  }

  async transfer(params: TransferParams): Promise<TransferResult> {
    // Phase 2: simulated transfer — log the intent, return a deterministic hash.
    // Phase 4 replaces this with real CDP/on-chain execution.
    const hashBytes = new Uint8Array(32);
    crypto.getRandomValues(hashBytes);
    const txHash = '0x' + Array.from(hashBytes, (b) => b.toString(16).padStart(2, '0')).join('');

    console.log(
      `[base] simulated transfer: ${params.amount} ${params.token} from ${params.from} to ${params.to}`,
    );

    return { txHash, status: 'simulated' };
  }

  explorerUrl(txHash: string): string {
    return `https://basescan.org/tx/${txHash}`;
  }
}
