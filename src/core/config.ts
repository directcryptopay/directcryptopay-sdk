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
    const raw = (userConfig.checkoutUrl || 'https://directcryptopay.com').replace(/\/$/, '');

    // SECURITY — checkoutUrl ends up as an iframe src and as the expected
    // postMessage origin. Reject anything that is not plain http(s) so a
    // malformed or hostile value cannot degrade origin checking.
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error('DirectCryptoPay: checkoutUrl must be an absolute URL');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('DirectCryptoPay: checkoutUrl must use http or https');
    }

    this.config = { checkoutUrl: raw };
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
