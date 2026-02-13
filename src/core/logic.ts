import { getBalance, readContract } from '@wagmi/core';
import { formatUnits, erc20Abi } from 'viem';
import { walletManager } from './wallet';
import type { TokenConfig, TokenWithBalance } from '../types';

export async function fetchTokenBalances(
  tokens: TokenConfig[],
  walletAddress: `0x${string}`,
  chainId: number
): Promise<TokenWithBalance[]> {
  
  const balances = await Promise.all(
    tokens.map(async (token) => {
      try {
        let balance: bigint;
        const wagmiConfig = (walletManager as any).wagmiConfig; 

        if (token.isNative) {
          const res = await getBalance(wagmiConfig, {
            address: walletAddress,
            chainId,
          });
          balance = res.value;
        } else {
          balance = await readContract(wagmiConfig, {
            address: token.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [walletAddress],
            chainId,
          }) as bigint;
        }

        const balanceFormatted = formatUnits(balance, token.decimals);

        return {
          ...token,
          balance: balance.toString(),
          balanceFormatted,
          hasBalance: balance > 0n,
        };
      } catch (error) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, error);
        return {
          ...token,
          balance: '0',
          balanceFormatted: '0',
          hasBalance: false,
        };
      }
    })
  );

  return balances.sort((a, b) => {
    if (a.hasBalance && !b.hasBalance) return -1;
    if (!a.hasBalance && b.hasBalance) return 1;
    if (a.hasBalance && b.hasBalance) {
      return BigInt(b.balance) > BigInt(a.balance) ? 1 : -1;
    }
    return 0;
  });
}