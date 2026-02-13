import { h, render } from 'preact';
import { Modal } from './Modal';
import type { PaymentCallbacks } from '../types';

export function mountModal(props: { 
  toolId: string; 
  callbacks?: PaymentCallbacks;
  onClose: () => void; 
}) {
  let container = document.getElementById('dcp-modal-host');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'dcp-modal-host';
    document.body.appendChild(container);
  } else {
    // If exists, clear it (simulating fresh mount)
    container.innerHTML = ''; 
  }
  
  const shadow = container.attachShadow({ mode: 'open' });
  const root = document.createElement('div');
  shadow.appendChild(root);

  // Inject styles to reset
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; display: block; }
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  `;
  shadow.appendChild(style);

  render(h(Modal, { ...props, root: container }), root);
}
