#!/usr/bin/env node
/**
 * Basic test for @directcryptopay/sdk
 * Run: node test.mjs
 */

import { verifyWebhookSignature } from './dist/index.js';

async function runTests() {
  console.log('🧪 Testing @directcryptopay/sdk\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Valid signature
  {
    const secret = 'test_secret_123';
    const body = '{"event":"payment.succeeded","data":{"id":"pi_test"}}';
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate valid signature
    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signatureHeader = `t=${timestamp},v1=${sigHex}`;

    const isValid = await verifyWebhookSignature({
      rawBody: body,
      signatureHeader,
      secret,
    });

    if (isValid) {
      console.log('✅ Test 1: Valid signature verification - PASSED');
      passed++;
    } else {
      console.log('❌ Test 1: Valid signature verification - FAILED');
      failed++;
    }
  }

  // Test 2: Invalid signature (wrong secret)
  {
    const secret = 'test_secret_123';
    const wrongSecret = 'wrong_secret';
    const body = '{"event":"payment.failed","data":{"id":"pi_test2"}}';
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate signature with wrong secret
    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(wrongSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signatureHeader = `t=${timestamp},v1=${sigHex}`;

    const isValid = await verifyWebhookSignature({
      rawBody: body,
      signatureHeader,
      secret, // Verify with correct secret
    });

    if (!isValid) {
      console.log('✅ Test 2: Invalid signature rejection - PASSED');
      passed++;
    } else {
      console.log('❌ Test 2: Invalid signature rejection - FAILED');
      failed++;
    }
  }

  // Test 3: Expired timestamp (replay attack prevention)
  {
    const secret = 'test_secret_123';
    const body = '{"event":"payment.succeeded","data":{"id":"pi_test3"}}';
    const timestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

    const payload = `${timestamp}.${body}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const sigHex = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const signatureHeader = `t=${timestamp},v1=${sigHex}`;

    const isValid = await verifyWebhookSignature({
      rawBody: body,
      signatureHeader,
      secret,
      toleranceSec: 300, // 5 minutes tolerance
    });

    if (!isValid) {
      console.log('✅ Test 3: Replay attack prevention - PASSED');
      passed++;
    } else {
      console.log('❌ Test 3: Replay attack prevention - FAILED');
      failed++;
    }
  }

  // Test 4: Missing signature header
  {
    const isValid = await verifyWebhookSignature({
      rawBody: '{"event":"payment.succeeded"}',
      signatureHeader: '',
      secret: 'test_secret',
    });

    if (!isValid) {
      console.log('✅ Test 4: Missing signature header - PASSED');
      passed++;
    } else {
      console.log('❌ Test 4: Missing signature header - FAILED');
      failed++;
    }
  }

  // Test 5: Malformed signature header
  {
    const isValid = await verifyWebhookSignature({
      rawBody: '{"event":"payment.succeeded"}',
      signatureHeader: 'invalid_format',
      secret: 'test_secret',
    });

    if (!isValid) {
      console.log('✅ Test 5: Malformed signature header - PASSED');
      passed++;
    } else {
      console.log('❌ Test 5: Malformed signature header - FAILED');
      failed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${passed + failed} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
