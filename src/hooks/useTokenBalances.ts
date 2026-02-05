"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
import { TokenBalance } from "@/types";
import { getTokenInfo, extractSymbolFromType, TOKENS } from "@/lib/tokens";
import { formatBalance, isDustToken } from "@/lib/utils";
import { DEFAULT_DUST_THRESHOLD_USD, SUI_TYPE } from "@/lib/constants";

interface CoinBalance {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: Record<string, string>;
}

export function useTokenBalances(dustThreshold: number = DEFAULT_DUST_THRESHOLD_USD) {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!account?.address) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get all coin balances
      const allBalances = await client.getAllBalances({
        owner: account.address,
      });

      // Get coin objects for each balance type
      const tokenBalances: TokenBalance[] = await Promise.all(
        allBalances.map(async (balance: CoinBalance) => {
          const coinType = balance.coinType;
          const tokenInfo = getTokenInfo(coinType);
          
          // Get all coin objects for this type
          const coins = await client.getCoins({
            owner: account.address,
            coinType: coinType,
          });

          const objectIds = coins.data.map((coin) => coin.coinObjectId);
          const totalBalance = BigInt(balance.totalBalance);
          const decimals = tokenInfo?.decimals || 9;
          
          // Get price (simplified - in production, use a price oracle)
          let priceUSD = 0;
          if (coinType === SUI_TYPE) {
            priceUSD = await fetchSuiPrice();
          } else {
            priceUSD = await fetchTokenPrice(coinType);
          }

          const balanceFormatted = Number(formatBalance(totalBalance.toString(), decimals));
          const valueUSD = balanceFormatted * priceUSD;

          return {
            coinType,
            symbol: tokenInfo?.symbol || extractSymbolFromType(coinType),
            name: tokenInfo?.name || extractSymbolFromType(coinType),
            balance: totalBalance,
            decimals,
            logo: tokenInfo?.logo || null,
            priceUSD,
            valueUSD,
            objectIds,
            isDust: coinType !== SUI_TYPE && isDustToken(valueUSD, dustThreshold),
            selected: false,
          };
        })
      );

      // Sort: dust tokens first, then by value descending
      const sortedBalances = tokenBalances.sort((a, b) => {
        if (a.coinType === SUI_TYPE) return -1;
        if (b.coinType === SUI_TYPE) return 1;
        if (a.isDust && !b.isDust) return -1;
        if (!a.isDust && b.isDust) return 1;
        return b.valueUSD - a.valueUSD;
      });

      setBalances(sortedBalances);
    } catch (err) {
      console.error("Error fetching balances:", err);
      setError("Failed to fetch token balances");
    } finally {
      setIsLoading(false);
    }
  }, [client, account?.address, dustThreshold]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const toggleSelection = useCallback((coinType: string) => {
    setBalances((prev) =>
      prev.map((token) =>
        token.coinType === coinType && token.coinType !== SUI_TYPE
          ? { ...token, selected: !token.selected }
          : token
      )
    );
  }, []);

  const selectAllDust = useCallback(() => {
    setBalances((prev) =>
      prev.map((token) =>
        token.isDust ? { ...token, selected: true } : token
      )
    );
  }, []);

  const deselectAll = useCallback(() => {
    setBalances((prev) =>
      prev.map((token) => ({ ...token, selected: false }))
    );
  }, []);

  const selectedTokens = balances.filter((t) => t.selected);
  const dustTokens = balances.filter((t) => t.isDust);
  const totalDustValue = dustTokens.reduce((acc, t) => acc + t.valueUSD, 0);
  const selectedValue = selectedTokens.reduce((acc, t) => acc + t.valueUSD, 0);

  return {
    balances,
    isLoading,
    error,
    fetchBalances,
    toggleSelection,
    selectAllDust,
    deselectAll,
    selectedTokens,
    dustTokens,
    totalDustValue,
    selectedValue,
  };
}

// Simplified price fetching (in production, use proper price oracles)
async function fetchSuiPrice(): Promise<number> {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd"
    );
    const data = await response.json();
    return data.sui?.usd || 0;
  } catch {
    // Fallback price
    return 3.5;
  }
}

async function fetchTokenPrice(coinType: string): Promise<number> {
  // Map common tokens to CoinGecko IDs
  const coinGeckoIds: Record<string, string> = {
    [TOKENS.USDC.type]: "usd-coin",
    [TOKENS.USDT.type]: "tether",
    [TOKENS.WETH.type]: "ethereum",
    [TOKENS.CETUS.type]: "cetus-protocol",
    [TOKENS.SCA.type]: "scallop-2",
    [TOKENS.NAVX.type]: "navi-protocol",
  };

  const id = coinGeckoIds[coinType];
  if (!id) {
    // For unknown tokens, try DexScreener
    try {
      const shortType = coinType.split("::").slice(0, 2).join("::");
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${shortType}`
      );
      const data = await response.json();
      if (data.pairs && data.pairs.length > 0) {
        return parseFloat(data.pairs[0].priceUsd) || 0;
      }
    } catch {
      return 0;
    }
    return 0;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[id]?.usd || 0;
  } catch {
    return 0;
  }
}
