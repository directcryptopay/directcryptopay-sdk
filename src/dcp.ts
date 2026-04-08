import { config, type DCPInitConfig } from './core/config';
import { openCheckoutIframe } from './core/iframe';
import type { DCPPayOptions, DCPPaymentOptions } from './types';

export class DCP {
  private static instance: DCP;
  private cleanup: (() => void) | null = null;
  private warmupFrame: HTMLIFrameElement | null = null;

  private constructor() {}

  static getInstance(): DCP {
    if (!DCP.instance) {
      DCP.instance = new DCP();
    }
    return DCP.instance;
  }

  /**
   * Initialize the SDK. Must be called before pay() or Payment().
   * Starts background warmup to preload checkout resources.
   */
  init(initConfig: DCPInitConfig): void {
    if (config.isInitialized()) {
      console.warn('DirectCryptoPay: SDK already initialized');
      return;
    }
    config.init(initConfig);
    this.warmup();
  }

  /**
   * Preload checkout resources in the background.
   * Creates preconnect hints and a hidden iframe to cache:
   * - Next.js runtime + CSS
   * - DCP widget script
   * - DNS + TLS handshake
   */
  private warmup(): void {
    if (typeof document === 'undefined') return;

    const { checkoutUrl } = config.get();

    // 1. Preconnect to checkout domain (saves DNS + TLS ~200-500ms)
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = checkoutUrl;
    document.head.appendChild(link);

    // 2. Hidden iframe warmup — loads checkout page to cache all resources
    //    Uses requestIdleCallback to avoid blocking main thread
    const startWarmup = () => {
      if (this.warmupFrame) return;

      const frame = document.createElement('iframe');
      frame.src = `${checkoutUrl}/pay/checkout?embedded=true`;
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      Object.assign(frame.style, {
        position: 'fixed',
        width: '0',
        height: '0',
        border: 'none',
        opacity: '0',
        pointerEvents: 'none',
        top: '-9999px',
      } as CSSStyleDeclaration);

      this.warmupFrame = frame;
      document.body.appendChild(frame);

      // Clean up after resources are cached (dcp:ready or timeout)
      const cleanupWarmup = () => {
        if (this.warmupFrame && this.warmupFrame.parentNode) {
          this.warmupFrame.parentNode.removeChild(this.warmupFrame);
        }
        this.warmupFrame = null;
        window.removeEventListener('message', onReady);
      };

      const onReady = (e: MessageEvent) => {
        if (e.data?.type === 'dcp:ready') cleanupWarmup();
      };
      window.addEventListener('message', onReady);

      // Fallback: remove after 15s even if dcp:ready never fires
      setTimeout(cleanupWarmup, 15000);
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(startWarmup, { timeout: 3000 });
    } else {
      setTimeout(startWarmup, 100);
    }
  }

  /**
   * Open a checkout iframe for a Payment Tool (link, button, donation, etc.).
   * The checkout page handles wallet connection, token selection, and payment.
   */
  pay(options: DCPPayOptions): void {
    if (!config.isInitialized()) {
      throw new Error('DirectCryptoPay: SDK not initialized. Call DCP.init() first');
    }

    // Remove warmup frame if still present
    if (this.warmupFrame?.parentNode) {
      this.warmupFrame.parentNode.removeChild(this.warmupFrame);
      this.warmupFrame = null;
    }

    const { checkoutUrl } = config.get();
    const params = new URLSearchParams({ embedded: 'true' });
    if (options.amountUsd) params.set('amount', String(options.amountUsd));

    const url = `${checkoutUrl}/pay/${options.toolId}?${params.toString()}`;
    const cb = options.callbacks;

    this.cleanup?.();
    this.cleanup = openCheckoutIframe(url, {
      onReady: () => cb?.onOpen?.(),
      onTxSubmitted: (txHash) => cb?.onTxSubmitted?.(txHash),
      onSuccess: (data) => cb?.onSuccess?.(data),
      onError: (error) => cb?.onError?.(new Error(error)),
      onClose: () => {
        this.cleanup = null;
        cb?.onClose?.();
      },
      onCancel: () => {
        this.cleanup = null;
        cb?.onCancel?.();
      },
    });
  }

  /**
   * Open a checkout iframe for an Integration with dynamic amount.
   * Use this for programmatic payments where amount is determined at runtime.
   */
  Payment(options: DCPPaymentOptions): void {
    if (!config.isInitialized()) {
      throw new Error('DirectCryptoPay: SDK not initialized. Call DCP.init() first');
    }

    if (!options.integrationId) {
      throw new Error('DirectCryptoPay: integrationId is required');
    }

    // Remove warmup frame if still present
    if (this.warmupFrame?.parentNode) {
      this.warmupFrame.parentNode.removeChild(this.warmupFrame);
      this.warmupFrame = null;
    }

    const { checkoutUrl } = config.get();
    const params = new URLSearchParams({ embedded: 'true' });
    params.set('integrationId', options.integrationId);
    if (options.amount_usd) params.set('amount_usd', options.amount_usd);
    if (options.amount != null) params.set('amount', String(options.amount));
    if (options.currency) params.set('currency', options.currency);
    if (options.chainId) params.set('chainId', String(options.chainId));
    if (options.metadata) params.set('metadata', JSON.stringify(options.metadata));

    const url = `${checkoutUrl}/pay/checkout?${params.toString()}`;
    const cb = options.callbacks;

    this.cleanup?.();
    this.cleanup = openCheckoutIframe(url, {
      onReady: () => cb?.onOpen?.(),
      onTxSubmitted: (txHash) => cb?.onTxSubmitted?.(txHash),
      onSuccess: (data) => cb?.onSuccess?.(data),
      onError: (error) => cb?.onError?.(new Error(error)),
      onClose: () => {
        this.cleanup = null;
        cb?.onClose?.();
      },
      onCancel: () => {
        this.cleanup = null;
        cb?.onCancel?.();
      },
    });
  }

  /**
   * Programmatically close the checkout iframe.
   */
  close(): void {
    this.cleanup?.();
    this.cleanup = null;
  }
}

export const dcp = DCP.getInstance();
