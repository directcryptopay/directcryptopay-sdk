import { config } from './config';
import type { ToolData, BackendIntentResponse } from '../types';

export interface SubmitPaymentRequest {
  tx_hash: string;
  chain_id: number;
  amount_wei: string;
  token_address: string;
  recipient: string;
  metadata?: Record<string, any>;
}

export interface SubmitPaymentResponse {
  payment_id: string;
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  message: string;
}

export interface PaymentStatusResponse {
  payment_id: string;
  tx_hash: string;
  chain_id: number;
  status: 'pending' | 'confirmed' | 'failed';
  verified_at: string | null;
  metadata?: Record<string, any>;
}

export class API {
  async fetchTool(toolId: string): Promise<ToolData> {
    const cfg = config.get();
    const response = await fetch(`${cfg.apiUrl}/payment-tools/public/${toolId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch payment tool: ${response.statusText}`);
    }
    
    return response.json();
  }

  async createIntent(toolId: string, tokenSymbol: string): Promise<BackendIntentResponse> {
    const cfg = config.get();
    const response = await fetch(`${cfg.apiUrl}/payment-tools/public/${toolId}/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedToken: tokenSymbol }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create intent: ${response.statusText}`);
    }

    return response.json();
  }

  async submitPayment(request: SubmitPaymentRequest, toolId?: string): Promise<SubmitPaymentResponse> {
    const cfg = config.get();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (toolId) {
      headers['X-Tool-Id'] = toolId;
    }

    const response = await fetch(`${cfg.apiUrl}/payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit payment: ${response.statusText}`);
    }

    return response.json();
  }

  async getPaymentStatus(paymentId: string, toolId?: string): Promise<PaymentStatusResponse> {
    const cfg = config.get();
    const headers: Record<string, string> = {};
    
    if (toolId) {
      headers['X-Tool-Id'] = toolId;
    }

    const response = await fetch(`${cfg.apiUrl}/payments/${paymentId}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to get payment status: ${response.statusText}`);
    }

    return response.json();
  }
}

export const api = new API();
