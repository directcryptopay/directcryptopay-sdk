export interface NetworkConfig {
  chainId: number;
  name: string;
  currency: string;
  isTestnet: boolean;
  rpcUrl: string;
  explorerUrl: string;
}

export interface DCPInitConfig {
  apiUrl?: string;
  widgetUrl?: string;
  projectId: string; // WalletConnect Project ID (Required)
  env?: 'test' | 'prod';
  defaultChainId?: number;
  gasWarningThreshold?: number;
}

export interface DCPConfig extends DCPInitConfig {
  apiUrl: string;
  widgetUrl: string;
  gasWarningThreshold: number;
}

class Config {
  private config: DCPConfig | null = null;

  init(config: DCPInitConfig): void {
    this.config = {
      ...config,
      apiUrl: config.apiUrl || 'https://api.directcryptopay.com',
      widgetUrl: config.widgetUrl || 'https://pay.directcryptopay.com',
      gasWarningThreshold: config.gasWarningThreshold ?? 15,
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

export const NETWORKS: Record<number, NetworkConfig> = {
  // Ethereum Mainnet
  1: {
    chainId: 1,
    name: 'Ethereum',
    currency: 'ETH',
    isTestnet: false,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
  },
  // Sepolia Testnet
  11155111: {
    chainId: 11155111,
    name: 'Sepolia',
    currency: 'ETH',
    isTestnet: true,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
  // Polygon Mainnet
  137: {
    chainId: 137,
    name: 'Polygon',
    currency: 'MATIC',
    isTestnet: false,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
  },
  // Polygon Amoy Testnet
  80002: {
    chainId: 80002,
    name: 'Amoy',
    currency: 'MATIC',
    isTestnet: true,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorerUrl: 'https://www.oklink.com/amoy',
  },
  // BNB Chain Mainnet
  56: {
    chainId: 56,
    name: 'BNB Chain',
    currency: 'BNB',
    isTestnet: false,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
  },
  // BNB Testnet
  97: {
    chainId: 97,
    name: 'BNB Testnet',
    currency: 'BNB',
    isTestnet: true,
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
    explorerUrl: 'https://testnet.bscscan.com',
  },
};

export function getNetwork(chainId: number): NetworkConfig {
  const network = NETWORKS[chainId];
  if (!network) {
    throw new Error(`DirectCryptoPay: Unsupported network with chainId ${chainId}`);
  }
  return network;
}

export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  }
] as const;
