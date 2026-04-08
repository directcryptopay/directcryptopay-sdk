export interface IframeCallbacks {
  onReady?: () => void;
  onTxSubmitted?: (txHash: string) => void;
  onSuccess?: (data: { txHash: string; intentId?: string }) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  onCancel?: () => void;
}

/**
 * Opens the DirectCryptoPay checkout page in an iframe overlay.
 * Returns a cleanup function to programmatically close the overlay.
 */
export function openCheckoutIframe(url: string, callbacks?: IframeCallbacks): () => void {
  let cleaned = false;

  // --- Overlay (single dark backdrop — widget overlay is transparent inside iframe) ---
  const overlay = document.createElement('div');
  overlay.id = 'dcp-checkout-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '99999',
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    boxSizing: 'border-box',
  } as CSSStyleDeclaration);

  // --- Container (full size — widget modals center themselves inside iframe) ---
  const container = document.createElement('div');
  Object.assign(container.style, {
    background: 'transparent',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    position: 'relative',
  } as CSSStyleDeclaration);

  // --- Close button (on overlay level, above iframe content) ---
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '20px',
    right: '20px',
    zIndex: '100000',
    background: 'rgba(255, 255, 255, 0.9)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    fontSize: '20px',
    lineHeight: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    color: '#6b7280',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as CSSStyleDeclaration);

  // --- Iframe (full viewport — widget modals won't get clipped) ---
  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.setAttribute('allowtransparency', 'true');
  Object.assign(iframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    display: 'block',
    background: 'transparent',
    colorScheme: 'normal',
  } as CSSStyleDeclaration);

  container.appendChild(iframe);
  overlay.appendChild(closeBtn);
  overlay.appendChild(container);

  // --- Cleanup ---
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('keydown', handleKeydown);
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };

  // --- Event handlers ---
  closeBtn.onclick = () => {
    cleanup();
    callbacks?.onClose?.();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cleanup();
      callbacks?.onClose?.();
    }
  });

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      cleanup();
      callbacks?.onClose?.();
    }
  };
  window.addEventListener('keydown', handleKeydown);

  // --- postMessage listener ---
  const handleMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;
    if (!data.type.startsWith('dcp:')) return;

    switch (data.type) {
      case 'dcp:ready':
        callbacks?.onReady?.();
        break;
      case 'dcp:payment-submitted':
        callbacks?.onTxSubmitted?.(data.txHash);
        break;
      case 'dcp:payment-success':
        callbacks?.onSuccess?.({ txHash: data.txHash, intentId: data.intentId });
        break;
      case 'dcp:payment-error':
        callbacks?.onError?.(data.error);
        break;
      case 'dcp:payment-cancelled':
        callbacks?.onCancel?.();
        cleanup();
        break;
      case 'dcp:close':
        callbacks?.onClose?.();
        cleanup();
        break;
    }
  };
  window.addEventListener('message', handleMessage);

  // --- Mount ---
  document.body.appendChild(overlay);

  return cleanup;
}
