import { config, type DCPInitConfig } from './core/config';
import { walletManager } from './core/wallet';
import { mountModal } from './ui/index';
import type { DCPPayOptions } from './types';

export class DCP {
  private static instance: DCP;

  private constructor() {}

  static getInstance(): DCP {
    if (!DCP.instance) {
      DCP.instance = new DCP();
    }
    return DCP.instance;
  }

  init(initConfig: DCPInitConfig): void {
    if (config.isInitialized()) {
      console.warn('DirectCryptoPay: SDK already initialized');
      return;
    }
    
    config.init(initConfig);
    walletManager.init(initConfig.projectId);
    console.log('DirectCryptoPay: SDK Initialized');
  }

  pay(options: DCPPayOptions): void {
    if (!config.isInitialized()) {
      throw new Error('DirectCryptoPay: SDK not initialized. Call DCP.init() first');
    }

    mountModal({
      toolId: options.toolId,
      callbacks: options.callbacks,
      onClose: () => {
        options.callbacks?.onClose?.();
      }
    });
  }
}

export const dcp = DCP.getInstance();
