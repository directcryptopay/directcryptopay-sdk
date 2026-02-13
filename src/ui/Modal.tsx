import { useState, useEffect } from 'preact/hooks';
import { api } from '../core/api';
import { walletManager } from '../core/wallet';
import { fetchTokenBalances } from '../core/logic';
import type { ToolData, TokenWithBalance, PaymentCallbacks } from '../types';
import { erc20Abi, parseUnits } from 'viem';

interface ModalProps {
  toolId: string;
  onClose: () => void;
  callbacks?: PaymentCallbacks;
  root: HTMLElement;
}

type PaymentState = 
  | 'FETCHING_TOOL' 
  | 'CONNECT_WALLET' 
  | 'FETCHING_BALANCES' 
  | 'SELECT_TOKEN' 
  | 'REVIEW' 
  | 'PROCESSING' 
  | 'POLLING' 
  | 'SUCCESS' 
  | 'ERROR';

export function Modal({ toolId, onClose, callbacks, root }: ModalProps) {
  const [state, setState] = useState<PaymentState>('FETCHING_TOOL');
  const [toolData, setToolData] = useState<ToolData | null>(null);
  const [tokens, setTokens] = useState<TokenWithBalance[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenWithBalance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Cleanup function to remove the host element
  const close = () => {
    onClose();
    document.body.removeChild(root);
  };

  useEffect(() => {
    loadTool();
  }, [toolId]);

  const loadTool = async () => {
    try {
      callbacks?.onOpen?.();
      setState('FETCHING_TOOL');
      const data = await api.fetchTool(toolId);
      setToolData(data);
      
      if (walletManager.isConnected()) {
        checkBalances(data);
      } else {
        setState('CONNECT_WALLET');
      }
    } catch (e: any) {
      setError(e.message);
      setState('ERROR');
      callbacks?.onError?.(e);
    }
  };

  const connectWallet = async () => {
    try {
      await walletManager.connect();
      // Wait a bit for connection to settle
      setTimeout(() => {
         if (walletManager.isConnected() && toolData) {
            checkBalances(toolData);
         }
      }, 1000);
    } catch (e: any) {
      // User might close the modal
    }
  };
  
  // Watch for connection changes if using AppKit modal
  useEffect(() => {
      const interval = setInterval(() => {
          if (state === 'CONNECT_WALLET' && walletManager.isConnected() && toolData) {
              checkBalances(toolData);
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [state, toolData]);

  const checkBalances = async (data: ToolData) => {
    setState('FETCHING_BALANCES');
    try {
      const account = walletManager.getAccount();
      // Ensure we are on correct chain
      if (account.chainId !== data.chain_id) {
         await walletManager.switchNetwork(data.chain_id);
      }

      const balances = await fetchTokenBalances(data.available_tokens, account.address as `0x${string}`, data.chain_id);
      setTokens(balances);
      
      // Auto-select first with balance
      const defaultToken = balances.find(t => t.hasBalance) || balances[0];
      setSelectedToken(defaultToken);
      
      setState('SELECT_TOKEN');
    } catch (e: any) {
      setError(e.message);
      setState('ERROR');
      callbacks?.onError?.(e);
    }
  };

  const handlePay = async () => {
    if (!toolData || !selectedToken) return;
    
    try {
      setState('PROCESSING');
      
      // 1. Create Intent
      const intent = await api.createIntent(toolId, selectedToken.symbol);
      
      // 2. Send TX
      // Use parseUnits for precise string-based conversion (avoids floating-point errors)
      const wei = parseUnits(String(intent.amount), selectedToken.decimals);

      let hash;
      if (selectedToken.isNative) {
          hash = await walletManager.sendTransaction({
              to: intent.merchantAddress,
              value: wei,
              chainId: toolData.chain_id
          });
      } else {
          // ERC20
          const { encodeFunctionData } = await import('viem');
          const data = encodeFunctionData({
              abi: erc20Abi,
              functionName: 'transfer',
              args: [intent.merchantAddress, wei]
          });
          hash = await walletManager.sendTransaction({
              to: intent.tokenAddress,
              data,
              chainId: toolData.chain_id
          });
      }
      
      setTxHash(hash);
      callbacks?.onTxSubmitted?.(hash);
      
      // 3. Submit to backend
      setState('POLLING');
      const submitRes = await api.submitPayment({
          tx_hash: hash,
          chain_id: toolData.chain_id,
          amount_wei: wei.toString(),
          token_address: intent.tokenAddress,
          recipient: intent.merchantAddress,
          metadata: { toolId }
      }, toolId);

      // 4. Poll
      const poll = async () => {
         try {
             const status = await api.getPaymentStatus(submitRes.payment_id, toolId);
             if (status.status === 'confirmed') {
                 setState('SUCCESS');
                 callbacks?.onSuccess?.(status);
             } else if (status.status === 'failed') {
                 throw new Error('Payment failed verification');
             } else {
                 setTimeout(poll, 2000);
             }
         } catch (e: any) {
             setError(e.message);
             setState('ERROR');
         }
      };
      poll();

    } catch (e: any) {
      setError(e.message);
      setState('ERROR');
      callbacks?.onError?.(e);
    }
  };

  // --- RENDER HELPERS ---
  
  const styles = {
      overlay: {
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
      },
      modal: {
          background: 'white', borderRadius: '16px', width: '100%', maxWidth: '400px',
          padding: '24px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      },
      close: {
          position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '24px', color: '#9ca3af'
      },
      title: { margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold', color: '#111827' },
      btn: {
          width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
          background: '#8b5cf6', color: 'white', fontWeight: 'bold', cursor: 'pointer', marginTop: '16px'
      },
      tokenRow: (active: boolean) => ({
          display: 'flex', justifyContent: 'space-between', padding: '12px',
          border: `1px solid ${active ? '#8b5cf6' : '#e5e7eb'}`, borderRadius: '8px',
          marginBottom: '8px', cursor: 'pointer', background: active ? '#f5f3ff' : 'white'
      })
  };

  if (state === 'FETCHING_TOOL') {
      return (
          <div style={styles.overlay}>
             <div style={styles.modal}>Loading payment details...</div>
          </div>
      );
  }

  if (state === 'CONNECT_WALLET') {
      return (
          <div style={styles.overlay}>
             <div style={styles.modal}>
                 <button style={styles.close} onClick={close}>×</button>
                 <h2 style={styles.title}>Connect Wallet</h2>
                 <p>Please connect your wallet to continue.</p>
                 <button style={styles.btn} onClick={connectWallet}>Connect Wallet</button>
             </div>
          </div>
      );
  }

  if (state === 'SELECT_TOKEN' || state === 'REVIEW') {
      return (
          <div style={styles.overlay}>
             <div style={styles.modal}>
                 <button style={styles.close} onClick={close}>×</button>
                 <h2 style={styles.title}>Pay {toolData?.amount} {toolData?.currency_id}</h2>
                 <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                     {tokens.map(t => (
                         <div 
                             key={t.symbol} 
                             style={styles.tokenRow(selectedToken?.symbol === t.symbol)}
                             onClick={() => setSelectedToken(t)}
                         >
                             <span>{t.symbol}</span>
                             <span>{parseFloat(t.balanceFormatted).toFixed(4)}</span>
                         </div>
                     ))}
                 </div>
                 <button style={styles.btn} onClick={handlePay}>Pay now</button>
             </div>
          </div>
      );
  }
  
  if (state === 'PROCESSING' || state === 'POLLING') {
       return (
          <div style={styles.overlay}>
             <div style={styles.modal}>
                 <h2 style={styles.title}>Processing...</h2>
                 {txHash && <p style={{fontSize: '12px', wordBreak: 'break-all'}}>TX: {txHash}</p>}
                 <p>Please wait while we verify your payment.</p>
             </div>
          </div>
      );
  }

  if (state === 'SUCCESS') {
      return (
          <div style={styles.overlay}>
             <div style={styles.modal}>
                 <button style={styles.close} onClick={close}>×</button>
                 <h2 style={{...styles.title, color: '#10b981'}}>Payment Successful!</h2>
                 <p>Thank you for your payment.</p>
                 <button style={styles.btn} onClick={close}>Close</button>
             </div>
          </div>
      );
  }

  if (state === 'ERROR') {
      return (
          <div style={styles.overlay}>
             <div style={styles.modal}>
                 <button style={styles.close} onClick={close}>×</button>
                 <h2 style={{...styles.title, color: '#ef4444'}}>Error</h2>
                 <p>{error}</p>
                 <button style={styles.btn} onClick={() => setState('FETCHING_TOOL')}>Retry</button>
             </div>
          </div>
      );
  }

  return null;
}
