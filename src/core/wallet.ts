import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, sepolia, polygon, polygonAmoy, bsc, bscTestnet } from '@reown/appkit/networks';
import { 
  getAccount, 
  switchChain, 
  sendTransaction as wagmiSendTransaction, 
  waitForTransactionReceipt,
  type Config as WagmiConfig
} from '@wagmi/core';
import type { AppKit } from '@reown/appkit';

export class WalletManager {
  private adapter: WagmiAdapter | null = null;
  private kit: AppKit | null = null;
  public wagmiConfig: WagmiConfig | null = null;

  init(projectId: string) {
    if (this.kit) return;

    const networks = [mainnet, sepolia, polygon, polygonAmoy, bsc, bscTestnet];

    this.adapter = new WagmiAdapter({
      networks: networks as any,
      projectId,
      ssr: true
    });

    this.wagmiConfig = this.adapter.wagmiConfig;

    this.kit = createAppKit({
      adapters: [this.adapter as any],
      networks: networks as any,
      projectId,
      features: {
        analytics: true,
        email: false,
        socials: [],
      },
      themeMode: 'light',
    });
  }

  async connect(): Promise<void> {
    if (!this.kit) throw new Error('WalletManager not initialized');
    await this.kit.open();
  }

  getAccount() {
    if (!this.wagmiConfig) throw new Error('WalletManager not initialized');
    return getAccount(this.wagmiConfig);
  }

  async switchNetwork(chainId: number): Promise<void> {
    if (!this.wagmiConfig) throw new Error('WalletManager not initialized');
    await switchChain(this.wagmiConfig, { chainId });
  }

  async sendTransaction(tx: any): Promise<`0x${string}`> {
    if (!this.wagmiConfig) throw new Error('WalletManager not initialized');
    const hash = await wagmiSendTransaction(this.wagmiConfig, tx);
    return hash;
  }
  
  async waitForReceipt(hash: `0x${string}`) {
      if (!this.wagmiConfig) throw new Error('WalletManager not initialized');
      return waitForTransactionReceipt(this.wagmiConfig, { hash });
  }

  isConnected(): boolean {
    if (!this.wagmiConfig) return false;
    const { isConnected } = getAccount(this.wagmiConfig);
    return isConnected;
  }
  
  disconnect() {
      if(this.kit) {
          this.kit.disconnect();
      }
  }
}

export const walletManager = new WalletManager();
