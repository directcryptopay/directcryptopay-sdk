# @directcryptopay/sdk

> ## ⚠️ Security model — read this first
>
> **No signal coming from the browser is proof of payment.** The `onSuccess`,
> `onTxSubmitted` and `onCancel` callbacks exist for user experience only.
>
> **Never** grant access, ship an order, unlock a download or credit an account
> from a client-side callback. The only source of truth is the **HMAC-signed
> webhook**, verified server-side against your webhook secret.
>
> Since **v0.3.3** the SDK validates the `origin` and `source` of every incoming
> `postMessage`. Versions **0.3.2 and earlier did not** and could be tricked by
> any third-party frame or script on the merchant page into firing a fake
> `onSuccess`. Upgrade if you are on an older version.


Official SDK for DirectCryptoPay — accept crypto payments directly to your wallet. Non-custodial, multi-chain, developer-first.

## Features

- **Non-custodial** — Funds go directly from customer wallet to yours
- **Multi-chain** — Ethereum, Polygon, BNB Chain, Base, Arbitrum, Optimism, Avalanche (mainnet + testnet)
- **Lightweight** — ~5 KB bundle, opens checkout in an iframe overlay (like Stripe Checkout)
- **WalletConnect support** — MetaMask, Rabby, WalletConnect, and 300+ wallets
- **Two payment modes** — Tool-based (pre-configured) or Integration-based (dynamic amounts)
- **TypeScript-first** — Full type safety with exported types

## Installation

```bash
npm install @directcryptopay/sdk
# or
pnpm add @directcryptopay/sdk
# or
yarn add @directcryptopay/sdk
```

## Quick Start

### 1. Initialize the SDK

Call `DCP.init()` once when your app loads.

```typescript
import { DCP } from '@directcryptopay/sdk';

DCP.init({
  // Optional: defaults to 'https://directcryptopay.com'
  // checkoutUrl: 'https://preview.directcryptopay.com',
});
```

### 2. Accept a payment

**Option A: Payment Tool** (pre-configured amount, token, and chain)

```typescript
DCP.pay({
  toolId: 'your-tool-id', // From Dashboard > Payment Tools > Get Code
  callbacks: {
    onSuccess: (data) => {
      console.log('Payment confirmed:', data.txHash);
    },
    onError: (error) => {
      console.error('Payment failed:', error);
    },
  },
});
```

**Option B: Integration** (dynamic amount, token selector)

```typescript
DCP.Payment({
  integrationId: 'your-integration-id',
  amount_usd: '49.99',
  callbacks: {
    onSuccess: (data) => {
      console.log('Paid:', data.txHash);
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
  projectId?: string;     // Deprecated — no longer needed
  env?: 'test' | 'prod';
});
```

### `DCP.pay(options)`

Open the checkout iframe for a pre-configured Payment Tool.

```typescript
DCP.pay({
  toolId: string;               // Required — Payment Tool ID
  amountUsd?: number;           // Override USD amount (for donations)
  callbacks?: PaymentCallbacks;
});
```

### `DCP.Payment(options)`

Open the checkout iframe for an Integration-based payment.

```typescript
DCP.Payment({
  integrationId: string;                   // Required — Integration public ID
  amount_usd?: string;                     // Amount in USD (e.g., '49.99')
  amount?: string | number;                // OR amount in token units (not both)
  currency?: string;                       // Pre-select token (skips selector)
  chainId?: number;                        // Pre-select chain
  metadata?: Record<string, any>;          // Custom metadata
  callbacks?: PaymentCallbacks;
});
```

> **Note:** Provide either `amount_usd` or `amount`, not both.

### `DCP.close()`

Programmatically close the checkout iframe.

### Callbacks

All callbacks are optional.

```typescript
interface PaymentCallbacks {
  onOpen?: () => void;                                          // Iframe opened
  onClose?: () => void;                                         // Iframe closed
  onTxSubmitted?: (txHash: string) => void;                     // Transaction sent
  onSuccess?: (data: { txHash: string; intentId?: string }) => void;  // Payment confirmed
  onCancel?: () => void;                                        // User cancelled
  onError?: (error: Error) => void;                             // Error occurred
}
```

## Framework Examples

### Next.js (App Router)

**1. Create a provider:**

```tsx
// components/DCPProvider.tsx
'use client';

import { useEffect } from 'react';

export function DCPProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    import('@directcryptopay/sdk').then(({ DCP }) => {
      DCP.init({});
    });
  }, []);

  return <>{children}</>;
}
```

**2. Wrap your layout:**

```tsx
// app/layout.tsx
import { DCPProvider } from '@/components/DCPProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DCPProvider>{children}</DCPProvider>
      </body>
    </html>
  );
}
```

**3. Create a pay button:**

```tsx
// components/PayButton.tsx
'use client';

import { useState } from 'react';

export function PayButton({ toolId, label = 'Pay with Crypto' }: {
  toolId: string;
  label?: string;
}) {
  const [status, setStatus] = useState<string | null>(null);

  const handlePay = async () => {
    setStatus('pending');
    const { DCP } = await import('@directcryptopay/sdk');
    DCP.pay({
      toolId,
      callbacks: {
        onSuccess: () => setStatus('confirmed'),
        onError: () => setStatus('failed'),
        onClose: () => setStatus(null),
      }
    });
  };

  return (
    <button onClick={handlePay} disabled={status === 'pending'}>
      {status === 'confirmed' ? 'Payment Confirmed!' :
       status === 'pending' ? 'Processing...' : label}
    </button>
  );
}
```

### Vanilla JavaScript

```html
<script type="module">
  import { DCP } from 'https://unpkg.com/@directcryptopay/sdk/dist/index.js';

  DCP.init({});

  document.getElementById('pay-btn').addEventListener('click', () => {
    DCP.pay({
      toolId: 'your-tool-id',
      callbacks: {
        onSuccess: (data) => alert('Payment confirmed!'),
        onError: (error) => alert('Payment failed: ' + error.message),
      }
    });
  });
</script>
```

## How It Works

When `DCP.pay()` or `DCP.Payment()` is called, the SDK opens an iframe overlay pointing to the DirectCryptoPay checkout page. The checkout page handles:

1. Wallet connection (MetaMask, Rabby, WalletConnect, etc.)
2. Smart token detection and balance display
3. Network switching
4. Transaction signing and submission
5. On-chain verification

The SDK communicates with the iframe via `postMessage` and maps events to your callbacks. This architecture keeps the SDK lightweight (~5 KB) while providing the full checkout experience.

## Security

The frontend callbacks (`onSuccess`, `onError`) are for **UX purposes only**. For production apps, always verify payments server-side using [webhooks](https://docs.directcryptopay.com).

DirectCryptoPay is non-custodial: transactions go directly from the customer's wallet to your wallet address. No funds are held by DirectCryptoPay at any point.

## Migrating from v0.2.x

v0.3.0 is a major refactor. The public API is the same, but:

- `DCP.init({ projectId })` — `projectId` is no longer required (can be omitted)
- `DCP.init({ checkoutUrl })` — new option to customize checkout URL
- `onStatus` callback removed — use `onTxSubmitted` and `onSuccess` instead
- Bundle size reduced from ~3 MB to ~5 KB

## Links

- **Website:** [directcryptopay.com](https://directcryptopay.com)
- **Dashboard:** [directcryptopay.com/dashboard](https://directcryptopay.com/dashboard)
- **Documentation:** [docs.directcryptopay.com](https://docs.directcryptopay.com)
- **API Docs:** [api.directcryptopay.com/api/docs](https://api.directcryptopay.com/api/docs)
- **GitHub:** [github.com/directcryptopay](https://github.com/directcryptopay)

## License

MIT
