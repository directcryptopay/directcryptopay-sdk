/**
 * Callbacks for payment lifecycle events.
 */
export interface PaymentCallbacks {
  /** Fired when the checkout iframe opens. */
  onOpen?: () => void;
  /** Fired when the checkout iframe is closed (by user or programmatically). */
  onClose?: () => void;
  /** Fired when the transaction hash is available (TX sent, not yet confirmed). */
  onTxSubmitted?: (txHash: string) => void;
  /** Fired when the payment is confirmed on-chain. */
  onSuccess?: (data: { txHash: string; intentId?: string }) => void;
  /** Fired when the user explicitly cancels the payment. */
  onCancel?: () => void;
  /** Fired on payment error. */
  onError?: (error: Error) => void;
}

/**
 * Options for DCP.pay() — tool-based payments (payment links, buttons, etc.)
 */
export interface DCPPayOptions {
  /** The payment tool ID (from the dashboard). */
  toolId: string;
  /** Optional amount override in USD. */
  amountUsd?: number;
  /** Payment lifecycle callbacks. */
  callbacks?: PaymentCallbacks;
}

/**
 * Options for DCP.Payment() — integration-based payments with dynamic amounts.
 */
export interface DCPPaymentOptions {
  /** The integration public ID. */
  integrationId: string;
  /** Amount in USD (mutually exclusive with `amount`). */
  amount_usd?: string;
  /** Amount in token units (mutually exclusive with `amount_usd`). */
  amount?: string | number;
  /** Token symbol (e.g., 'USDC'). When omitted, user picks from available tokens. */
  currency?: string;
  /** Chain ID override. */
  chainId?: number;
  /** Arbitrary metadata passed to the backend. */
  metadata?: Record<string, any>;
  /** Payment lifecycle callbacks. */
  callbacks?: PaymentCallbacks;
}
