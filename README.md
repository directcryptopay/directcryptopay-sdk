# @directcryptopay/sdk

Official TypeScript/JavaScript SDK for DirectCryptoPay. Create payment intents, verify webhooks, and manage crypto payments from Node.js, Edge Functions, or the browser.

## Features

✅ **TypeScript-first** - Full type safety with exported types
✅ **Web Crypto API** - Works in Node.js, Edge (Vercel, Cloudflare), and browsers
✅ **Webhook verification** - HMAC-SHA256 signature validation
✅ **Zero dependencies** - Lightweight, uses only platform APIs
✅ **Idempotency support** - Prevent duplicate requests

## Installation

```bash
npm install @directcryptopay/sdk
# or
pnpm add @directcryptopay/sdk
# or
yarn add @directcryptopay/sdk
```

## Quick Start

### Server-side: Create Payment Intent

```typescript
import { DirectCryptoPay } from '@directcryptopay/sdk';

const dcp = new DirectCryptoPay({
  baseURL: 'https://test-api.directcryptopay.com',
  apiKey: process.env.DCP_API_KEY!,
});

const intent = await dcp.createPaymentIntent({
  amount: 49.99,
  currency: 'USD',
  metadata: {
    order_id: 'ORD-123',
    customer_email: 'customer@example.com'
  },
  idempotencyKey: crypto.randomUUID(), // Recommended
});

console.log(intent.id); // pi_abc123...
console.log(intent.recipient); // 0x1234...
console.log(intent.amount_wei); // "50000000000000000"
```

### Server-side: Verify Webhook

```typescript
import { verifyWebhookSignature } from '@directcryptopay/sdk';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-dcp-signature') ?? '';

  const isValid = await verifyWebhookSignature({
    rawBody,
    signatureHeader: signature,
    secret: process.env.DCP_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === 'payment.succeeded') {
    // Handle payment success
    console.log('Payment confirmed:', event.data.id);
  }

  return new Response('OK', { status: 200 });
}
```

## API Reference

### `DirectCryptoPay`

Main SDK class for interacting with DirectCryptoPay API.

#### Constructor

```typescript
const dcp = new DirectCryptoPay({
  baseURL: string;      // e.g., 'https://api.directcryptopay.com'
  apiKey: string;       // Your server-side API key
  fetch?: typeof fetch; // Optional: custom fetch (for testing)
});
```

#### Methods

##### `createPaymentIntent(input)`

Create a new payment intent.

```typescript
const intent = await dcp.createPaymentIntent({
  amount: 49.99,
  currency: 'USD',
  metadata?: { order_id: 'ORD-123' },
  expiry_seconds?: 900, // Default: 900 (15 min)
  idempotencyKey?: string, // Recommended
});
```

**Returns:** `Promise<Intent>`

##### `declareTx(input)`

Declare a blockchain transaction for a payment intent.

```typescript
await dcp.declareTx({
  intentId: 'pi_abc123',
  txHash: '0x1234...',
  idempotencyKey?: string,
});
```

**Returns:** `Promise<{ accepted: true }>`

##### `getIntentStatus(intentId)`

Get current status of a payment intent.

```typescript
const intent = await dcp.getIntentStatus('pi_abc123');
console.log(intent.status); // 'created' | 'pending' | 'paid' | 'failed' | 'expired'
```

**Returns:** `Promise<Intent>`

##### `waitForConfirmation(intentId, options?)`

Poll for payment confirmation with automatic retry.

```typescript
const confirmedIntent = await dcp.waitForConfirmation('pi_abc123', {
  intervalMs: 2000,     // Poll every 2 seconds
  maxAttempts: 60,      // Max 60 attempts (2 min total)
  onTick: (attempt, status) => {
    console.log(`Attempt ${attempt}: ${status}`);
  },
});

console.log('Payment confirmed:', confirmedIntent.tx_hash);
```

**Returns:** `Promise<Intent>` (with `status: 'paid'`)
**Throws:** If payment fails, expires, or times out

##### `listPaymentIntents(options?)`

List payment intents with pagination.

```typescript
const { data, hasMore, nextCursor } = await dcp.listPaymentIntents({
  limit: 20,
  cursor: 'cursor_abc',
  status: 'paid',
});
```

**Returns:** `Promise<{ data: Intent[], hasMore: boolean, nextCursor?: string }>`

### `verifyWebhookSignature(options)`

Verify HMAC-SHA256 webhook signature (timing-safe).

```typescript
const isValid = await verifyWebhookSignature({
  rawBody: string,          // Request body as string (exact as received)
  signatureHeader: string,  // 'X-DCP-Signature' header value
  secret: string,           // Your webhook secret
  toleranceSec?: number,    // Default: 300 (5 minutes)
});
```

**Returns:** `Promise<boolean>`

## Types

All types are exported:

```typescript
import type {
  Intent,
  PaymentStatus,
  CreateIntentInput,
  DeclareTxInput,
  SdkConfig,
  ChainId,
} from '@directcryptopay/sdk';
```

### `Intent`

```typescript
interface Intent {
  id: string;
  chain_id: ChainId;
  recipient: `0x${string}`;
  amount_wei: string;
  currency: string;
  amount: number;
  expires_at: string;
  status: PaymentStatus;
  signature: string;
  asset_type: 'native' | 'erc20';
  token_address?: `0x${string}`;
  tx_hash?: `0x${string}`;
  confirmed_at?: string;
}
```

### `PaymentStatus`

```typescript
type PaymentStatus = 'created' | 'pending' | 'paid' | 'failed' | 'expired' | 'late_confirmed';
```

## Usage Examples

### Next.js API Route (App Router)

```typescript
// app/api/dcp/create-intent/route.ts
import { DirectCryptoPay } from '@directcryptopay/sdk';

const dcp = new DirectCryptoPay({
  baseURL: process.env.DCP_API_BASE!,
  apiKey: process.env.DCP_API_KEY!,
});

export async function POST(req: Request) {
  const { amount, currency } = await req.json();

  const intent = await dcp.createPaymentIntent({
    amount,
    currency,
    idempotencyKey: crypto.randomUUID(),
  });

  return Response.json(intent);
}
```

### Next.js Webhook Handler

```typescript
// app/api/dcp/webhook/route.ts
import { verifyWebhookSignature } from '@directcryptopay/sdk';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-dcp-signature') ?? '';

  const isValid = await verifyWebhookSignature({
    rawBody,
    signatureHeader: signature,
    secret: process.env.DCP_WEBHOOK_SECRET!,
  });

  if (!isValid) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawBody);

  switch (event.event) {
    case 'payment.succeeded':
      // Handle success
      break;
    case 'payment.failed':
      // Handle failure
      break;
  }

  return new Response('OK');
}
```

### Cloudflare Workers / Edge

```typescript
export default {
  async fetch(req: Request, env: Env) {
    const dcp = new DirectCryptoPay({
      baseURL: 'https://api.directcryptopay.com',
      apiKey: env.DCP_API_KEY,
    });

    const intent = await dcp.createPaymentIntent({
      amount: 99.99,
      currency: 'USD',
    });

    return new Response(JSON.stringify(intent), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
```

## Security Best Practices

### ✅ DO:

1. **Always verify webhook signatures** using `verifyWebhookSignature`
2. **Use environment variables** for API keys and secrets
3. **Use HTTPS in production**
4. **Use idempotency keys** to prevent duplicate payments
5. **Validate payment amounts** server-side before fulfillment

### ❌ DON'T:

1. **Never expose API keys** to the client (browser)
2. **Never trust client-side payment amounts**
3. **Never skip signature verification** on webhooks
4. **Never hardcode secrets** in source code

## Testing

The SDK uses Web Crypto API which works in:

- Node.js 16+ (with `globalThis.crypto`)
- Deno
- Cloudflare Workers
- Vercel Edge Functions
- Modern browsers

### Test Networks

- **Sepolia** (Ethereum) - chainId: 11155111
- **Polygon Amoy** - chainId: 80002
- **BSC Testnet** - chainId: 97

### Get Test Tokens

- Sepolia ETH: https://sepoliafaucet.com
- Sepolia USDC: https://faucet.circle.com

## Support

- **Documentation:** https://docs.directcryptopay.com
- **API Reference:** https://api.directcryptopay.com/docs
- **Dashboard:** https://app.directcryptopay.com

## License

MIT
