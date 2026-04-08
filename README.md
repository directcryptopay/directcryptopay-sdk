# @directcryptopay/sdk

Official client-side SDK for DirectCryptoPay. Embed a full crypto checkout experience on any website with a few lines of code. Zero dependencies, ~5KB gzipped.

## Features

- **Iframe-based checkout** - Full payment flow (wallet connect, chain/token selection, real-time balances) without touching Web3 libraries
- **Zero dependencies** - No wagmi, no viem, no wallet SDKs. Everything runs inside the checkout iframe.
- **Two payment modes** - `DCP.pay()` for payment tools (links, buttons) and `DCP.Payment()` for dynamic integration-based payments
- **Automatic warmup** - Preloads checkout resources in the background for instant popup
- **Lifecycle callbacks** - `onSuccess`, `onError`, `onTxSubmitted`, `onClose`, `onCancel`
- **Multi-chain** - Ethereum, Polygon, BNB Chain, Base, Arbitrum, Optimism (mainnet + testnet)
- **Non-custodial** - Payments go directly to your wallet

## Installation

```bash
npm install @directcryptopay/sdk
# or
pnpm add @directcryptopay/sdk
# or via CDN
<script src="https://unpkg.com/@directcryptopay/sdk/dist/dcp-sdk.umd.js"></script>
```

## Quick Start

### 1. Initialize the SDK

```html
<script type="module">
  import { DCP } from '@directcryptopay/sdk';

  DCP.init({
    // Optional: defaults to 'https://directcryptopay.com'
    // Use 'https://preview.directcryptopay.com' for testnet
    checkoutUrl: 'https://directcryptopay.com',
  });
</script>
```

### 2a. Pay with a Payment Tool (link/button)

Use this when you have a pre-configured payment tool from the dashboard with a fixed amount:

```javascript
DCP.pay({
  toolId: 'pt_abc123',  // From Dashboard > Payment Tools
  callbacks: {
    onSuccess: ({ txHash, intentId }) => {
      console.log('Payment confirmed!', txHash);
    },
    onError: (error) => {
      console.error('Payment failed:', error.message);
    },
    onClose: () => {
      console.log('Checkout closed');
    },
  },
});
```

### 2b. Pay with an Integration (dynamic amount)

Use this for e-commerce or programmatic payments where the amount is determined at runtime:

```javascript
DCP.Payment({
  integrationId: 'int_xyz789',  // From Dashboard > Integrations
  amount_usd: '49.99',
  currency: 'USDC',             // Optional: customer can still choose
  metadata: {
    order_id: 'ORD-123',
    customer_email: 'alice@example.com',
  },
  callbacks: {
    onSuccess: ({ txHash, intentId }) => {
      // Verify server-side via webhook before fulfilling
      fetch('/api/verify-payment', {
        method: 'POST',
        body: JSON.stringify({ intentId }),
      });
    },
    onError: (error) => {
      alert('Payment failed: ' + error.message);
    },
  },
});
```

## API Reference

### `DCP.init(config)`

Initialize the SDK. Must be called once before `pay()` or `Payment()`.

```typescript
DCP.init({
  checkoutUrl?: string;   // Default: 'https://directcryptopay.com'
  env?: 'test' | 'prod';  // Optional environment hint
});
```

### `DCP.pay(options)`

Open checkout for a pre-configured Payment Tool (link, button, donation widget).

```typescript
DCP.pay({
  toolId: string;          // Payment Tool ID (from dashboard)
  amountUsd?: number;      // Override the tool's default amount
  callbacks?: PaymentCallbacks;
});
```

### `DCP.Payment(options)`

Open checkout for an Integration with a dynamic amount.

```typescript
DCP.Payment({
  integrationId: string;            // Integration ID (from dashboard)
  amount_usd?: string;              // Amount in USD
  amount?: string | number;         // Amount in token units
  currency?: string;                // Token symbol (ETH, USDC, USDT...)
  chainId?: number;                 // Chain ID override
  metadata?: Record<string, any>;   // Passed to backend & webhooks
  callbacks?: PaymentCallbacks;
});
```

### `DCP.close()`

Programmatically close the checkout iframe.

### Callbacks

```typescript
interface PaymentCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onTxSubmitted?: (txHash: string) => void;
  onSuccess?: (data: { txHash: string; intentId?: string }) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
}
```

## UMD / Script Tag Usage

```html
<script src="https://unpkg.com/@directcryptopay/sdk/dist/dcp-sdk.umd.js"></script>
<script>
  const DCP = window.DCP.DCP;
  DCP.init({ checkoutUrl: 'https://directcryptopay.com' });

  document.getElementById('pay-btn').addEventListener('click', () => {
    DCP.pay({
      toolId: 'pt_abc123',
      callbacks: {
        onSuccess: (data) => alert('Paid! TX: ' + data.txHash),
      },
    });
  });
</script>
```

## How It Works

1. **`DCP.init()`** preconnects to the checkout domain and warms up resources in a hidden iframe
2. **`DCP.pay()` / `DCP.Payment()`** opens a full-screen overlay with the DirectCryptoPay checkout page in an iframe
3. The checkout page handles wallet connection, chain/token selection, balance display, and transaction signing
4. The iframe communicates back to the parent page via `postMessage` events
5. Your callbacks fire for each lifecycle event (`onTxSubmitted`, `onSuccess`, `onError`, etc.)
6. The backend independently monitors the blockchain and sends webhooks — **never trust client-side callbacks alone for fulfillment**

## Server-Side Verification

The SDK provides client-side callbacks for UX (show success screen, redirect, etc.), but you should **always verify payments server-side** via webhooks before fulfilling orders.

Set up a webhook endpoint in your DCP Dashboard integration. The backend sends HMAC-SHA256 signed webhooks:

```
Header: X-DCP-Signature: t=<timestamp>,v1=<hmac_hex>
```

See the [webhook documentation](https://docs.directcryptopay.com/webhooks/overview.html) and [examples repository](https://github.com/directcryptopay/directcryptopay-examples) for server-side verification code in Node.js, PHP, and more.

## Environments

| Environment | Checkout URL | Chains |
|-------------|-------------|--------|
| Production | `https://directcryptopay.com` (default) | Ethereum, Polygon, BNB, Base, Arbitrum, Optimism |
| Preview/Test | `https://preview.directcryptopay.com` | Sepolia, Amoy, BSC Testnet |

```javascript
// Testnet
DCP.init({ checkoutUrl: 'https://preview.directcryptopay.com' });
```

## Changelog

### 0.3.1 (Current)
- Complete rewrite: replaced Preact modal + wallet SDK with lightweight iframe
- Zero dependencies (was ~3MB, now ~5KB)
- Automatic resource warmup on `init()`
- postMessage-based communication with `dcp:` namespace
- Identical UX to the hosted checkout page

### 1.0.0 (Legacy)
- Server-side SDK with `createPaymentIntent`, `verifyWebhookSignature`
- Client-side Preact modal with wallet connection
- **Deprecated** - use v0.3.x iframe-based SDK instead

## Support

- **Docs:** https://docs.directcryptopay.com
- **Dashboard:** https://directcryptopay.com/dashboard
- **Email:** support@directcryptopay.com

## License

MIT
