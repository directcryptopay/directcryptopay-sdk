import type { Address, Hash } from 'viem';

/**
 * Payment intent from the API
 */
export interface PaymentIntent {
  id: string;
  chain_id: number;
  recipient: Address;
  amount_wei: string;
  currency: string;
  expires_at: string;
  signature: string;
  status: 'CREATED' | 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'LATE_CONFIRMED';
  metadata?: Record<string, any>;
  asset_type?: 'native' | 'erc20';
  token_address?: Address;
  token_decimals?: number;
  nonce?: string;
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  gasLimit: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  totalCostWei: bigint;
  percentageOfPayment: number;
  exceedsThreshold: boolean;
}

/**
 * Payment status update
 */
export type PaymentStatus =
  | { type: 'fetching_tool_data' }
  | { type: 'fetching_token_balances' }
  | { type: 'awaiting_token_selection' }
  | { type: 'creating_payment_intent' }
  | { type: 'estimating_gas' }
  | { type: 'gas_estimated'; estimate: GasEstimate }
  | { type: 'awaiting_wallet_connection' }
  | { type: 'wallet_connected'; address: Address }
  | { type: 'awaiting_signature' }
  | { type: 'transaction_submitted'; txHash: Hash }
  | { type: 'confirming'; txHash: Hash; confirmations: number }
  | { type: 'verifying'; txHash: Hash; paymentId: string }
  | { type: 'confirmed'; txHash: Hash; paymentId?: string }
  | { type: 'failed'; error: Error }
  | { type: 'rejected' }
  | { type: 'cancelled' };

export interface TokenConfig {
  symbol: string;
  name: string;
  address: string | null;
  decimals: number;
  isNative: boolean;
}

export interface TokenWithBalance extends TokenConfig {
  balance: string;
  balanceFormatted: string;
  hasBalance: boolean;
}

export interface ToolData {
  id: string;
  amount: string;
  currency_id: string;
  chain_id: number;
  recipient_address: string;
  available_tokens: TokenConfig[];
  metadata: {
    name: string;
    type: string;
  };
}

export interface BackendIntentResponse {
  id: string;
  amount: string; // Amount in token units
  currency: string;
  chainId: number;
  tokenAddress: Address;
  merchantAddress: Address;
  expiresAt: string;
  signature: string;
  nonce: string;
}

export interface PaymentCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onStatus?: (status: PaymentStatus) => void;
  onTxSubmitted?: (txHash: Hash) => void;
  onSuccess?: (receipt: any) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}

export interface DCPPayOptions {
  toolId: string;
  amountUsd?: number;
  token?: string;
  chainId?: number;
  metadata?: Record<string, string>;
  callbacks?: PaymentCallbacks;
}