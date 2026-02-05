"use client";

import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useCallback, useEffect, useState } from "react";
import { TokenBalance } from "@/types";
import { getTokenInfo, extractSymbolFromType } from "@/lib/tokens";
import { formatBalance, isDustToken } from "@/lib/utils";
import { DEFAULT_DUST_THRESHOLD_USD, SUI_TYPE } from "@/lib/constants";

interface CoinBalance {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: Record<string, string>;
}

interface TokenPriceData {
  coinType: string;
  price: number;
  symbol?: string;
  decimals?: number;
  logo?: string;
  usdValue?: number;
  verified?: boolean;
}

interface PriceApiResponse {
  success: boolean;
  prices: Record<string, TokenPriceData>;
  suiPrice: number;
}

export function useTokenBalances(dustThreshold: number = DEFAULT_DUST_THRESHOLD_USD) {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch prices from our API route (avoids CORS issues)
  const fetchPricesFromApi = useCallback(async (
    address: string,
    coinTypes: string[]
  ): Promise<{ prices: Record<string, TokenPriceData>; suiPrice: number }> => {
    try {
      const response = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, coinTypes }),
      });

      if (response.ok) {
        const data: PriceApiResponse = await response.json();
        if (data.success) {
          console.log("[API] Fetched prices:", Object.keys(data.prices).length);
          return { prices: data.prices, suiPrice: data.suiPrice };
        }
      }
    } catch (err) {
      console.error("[API] Failed to fetch prices:", err);
    }

    return { prices: {}, suiPrice: 0.95 };
  }, []);

  const fetchBalances = useCallback(async () => {
    if (!account?.address) {
      setBalances([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[TokenBalances] Fetching balances for:", account.address);
      
      // Get all coin balances from Sui client
      const allBalances = await client.getAllBalances({
        owner: account.address,
      });

      console.log("[TokenBalances] Raw balances:", allBalances);

      // Filter out zero balances
      const nonZeroBalances = allBalances.filter((balance: CoinBalance) => {
        const total = BigInt(balance.totalBalance);
        return total > BigInt(0);
      });

      console.log("[TokenBalances] Non-zero balances:", nonZeroBalances.length);

      // Get all coin types
      const allCoinTypes = nonZeroBalances.map((b: CoinBalance) => b.coinType);
      
      // Fetch prices from our API route (server-side to avoid CORS)
      const { prices: priceData, suiPrice } = await fetchPricesFromApi(
        account.address,
        allCoinTypes
      );
      console.log("[TokenBalances] SUI price:", suiPrice);

      // Process each token
      const tokenBalances: TokenBalance[] = await Promise.all(
        nonZeroBalances.map(async (balance: CoinBalance) => {
          const coinType = balance.coinType;
          const tokenInfo = getTokenInfo(coinType);
          const apiTokenData = priceData[coinType];
          
          // Get coin objects for this type
          const coins = await client.getCoins({
            owner: account.address,
            coinType: coinType,
          });

          const objectIds = coins.data.map((coin) => coin.coinObjectId);
          const totalBalance = BigInt(balance.totalBalance);
          
          // Try to get coin metadata from chain for accurate decimals
          let chainMetadata: { decimals: number; name: string; symbol: string; iconUrl?: string } | null = null;
          try {
            const metadata = await client.getCoinMetadata({ coinType });
            if (metadata) {
              chainMetadata = {
                decimals: metadata.decimals,
                name: metadata.name,
                symbol: metadata.symbol,
                iconUrl: metadata.iconUrl || undefined,
              };
              console.log(`[ChainMetadata] ${coinType}: decimals=${metadata.decimals}, symbol=${metadata.symbol}`);
            }
          } catch {
            // Ignore metadata fetch errors
          }
          
          // Use decimals from chain metadata (most accurate), then API data, token info, or default to 9
          const decimals = chainMetadata?.decimals ?? apiTokenData?.decimals ?? tokenInfo?.decimals ?? 9;
          
          // Get price and logo
          let priceUSD = 0;
          let logo = chainMetadata?.iconUrl || apiTokenData?.logo || tokenInfo?.logo || null;
          
          if (coinType === SUI_TYPE) {
            priceUSD = suiPrice;
          } else if (apiTokenData?.price && apiTokenData.price > 0) {
            priceUSD = apiTokenData.price;
            console.log(`[API] ${apiTokenData.symbol || coinType}: price=$${priceUSD}`);
          }

          const balanceFormatted = Number(formatBalance(totalBalance.toString(), decimals));
          
          // Use API's USD value if available, otherwise calculate
          let valueUSD = apiTokenData?.usdValue || (balanceFormatted * priceUSD);
          
          // Get symbol and name from multiple sources (chain metadata is most accurate)
          const symbol = chainMetadata?.symbol || apiTokenData?.symbol || tokenInfo?.symbol || extractSymbolFromType(coinType);
          const name = chainMetadata?.name || tokenInfo?.name || symbol;

          console.log(`[TokenBalances] ${symbol}: balance=${balanceFormatted}, price=$${priceUSD}, value=$${valueUSD}, decimals=${decimals}`);

          // Determine if this is a dust token
          // If price is 0 but we have a balance, consider it dust if balance is small
          // This helps detect low-value tokens that don't have price data
          let isDust = false;
          if (coinType !== SUI_TYPE) {
            if (valueUSD > 0) {
              isDust = isDustToken(valueUSD, dustThreshold);
            } else if (priceUSD === 0 && balanceFormatted > 0) {
              // No price data - mark as dust if it's a small amount or unknown token
              // This ensures tokens without price data still show up
              isDust = true;
            }
          }

          return {
            coinType,
            symbol,
            name,
            balance: totalBalance,
            decimals,
            logo,
            priceUSD,
            valueUSD,
            objectIds,
            isDust,
            selected: false,
            verified: apiTokenData?.verified || false,
          };
        })
      );

      // Sort: SUI first, then dust by value, then others by value
      const sortedBalances = tokenBalances.sort((a, b) => {
        // SUI always first
        if (a.coinType === SUI_TYPE) return -1;
        if (b.coinType === SUI_TYPE) return 1;
        
        // Then dust tokens (sorted by value ascending - smallest first)
        if (a.isDust && !b.isDust) return -1;
        if (!a.isDust && b.isDust) return 1;
        
        // Within same category, sort by value descending
        return b.valueUSD - a.valueUSD;
      });

      console.log("[TokenBalances] Final sorted balances:", sortedBalances.length);
      console.log("[TokenBalances] Dust tokens:", sortedBalances.filter(t => t.isDust).map(t => t.symbol));
      setBalances(sortedBalances);
    } catch (err) {
      console.error("[TokenBalances] Error fetching balances:", err);
      setError("Failed to fetch token balances");
    } finally {
      setIsLoading(false);
    }
  }, [client, account?.address, dustThreshold, fetchPricesFromApi]);

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

  // Update the action for a token (swap, burn, or donate)
  const updateTokenAction = useCallback((coinType: string, action: 'swap' | 'burn' | 'donate') => {
    setBalances((prev) =>
      prev.map((token) =>
        token.coinType === coinType
          ? { ...token, action }
          : token
      )
    );
  }, []);

  // Update hasRoute status for tokens based on route check results
  const updateTokenRoutes = useCallback((routeResults: Array<{ coinType: string; hasRoute: boolean }>) => {
    setBalances((prev) =>
      prev.map((token) => {
        const routeCheck = routeResults.find(r => r.coinType === token.coinType);
        if (routeCheck) {
          return { ...token, hasRoute: routeCheck.hasRoute };
        }
        return token;
      })
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
    updateTokenAction,
    updateTokenRoutes,
    selectedTokens,
    dustTokens,
    totalDustValue,
    selectedValue,
  };
}
