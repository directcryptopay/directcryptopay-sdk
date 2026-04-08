export interface DCPInitConfig {
  /** Checkout page base URL. Default: 'https://directcryptopay.com' */
  checkoutUrl?: string;
  /** @deprecated No longer needed — wallet connection happens inside iframe */
  projectId?: string;
  /** @deprecated Use checkoutUrl instead */
  apiUrl?: string;
  /** @deprecated Use checkoutUrl instead */
  widgetUrl?: string;
  env?: 'test' | 'prod';
}

export interface DCPConfig {
  checkoutUrl: string;
}

class Config {
  private config: DCPConfig | null = null;

  init(userConfig: DCPInitConfig): void {
    this.config = {
      checkoutUrl: (userConfig.checkoutUrl || 'https://directcryptopay.com').replace(/\/$/, ''),
    };
  }

  get(): DCPConfig {
    if (!this.config) {
      throw new Error('DirectCryptoPay: SDK not initialized. Call DCP.init() first');
    }
    return this.config;
  }

  isInitialized(): boolean {
    return this.config !== null;
  }
}

export const config = new Config();
