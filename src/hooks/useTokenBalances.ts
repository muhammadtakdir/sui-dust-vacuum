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

interface CetusTokenPrice {
  coin_type: string;
  price: string;
  symbol?: string;
  decimals?: number;
  logo_url?: string;
}

export function useTokenBalances(dustThreshold: number = DEFAULT_DUST_THRESHOLD_USD) {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all token prices from Cetus
  const fetchCetusPrices = useCallback(async (): Promise<Map<string, CetusTokenPrice>> => {
    const priceMap = new Map<string, CetusTokenPrice>();
    
    try {
      // Cetus coin list API with prices
      const response = await fetch("https://api-sui.cetus.zone/v2/sui/coins_price", {
        headers: { "Accept": "application/json" },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Cetus] Prices response:", data);
        
        // Handle different response formats
        const prices = data.data || data.result || data;
        
        if (Array.isArray(prices)) {
          prices.forEach((token: CetusTokenPrice) => {
            if (token.coin_type) {
              priceMap.set(token.coin_type, token);
            }
          });
        } else if (typeof prices === 'object') {
          // If it's an object with coin_type as keys
          Object.entries(prices).forEach(([coinType, priceData]) => {
            if (typeof priceData === 'object' && priceData !== null) {
              priceMap.set(coinType, priceData as CetusTokenPrice);
            } else if (typeof priceData === 'string' || typeof priceData === 'number') {
              priceMap.set(coinType, { coin_type: coinType, price: String(priceData) });
            }
          });
        }
      }
    } catch (err) {
      console.error("[Cetus] Failed to fetch prices:", err);
    }
    
    // Also try alternative endpoint
    if (priceMap.size === 0) {
      try {
        const altResponse = await fetch("https://api-sui.cetus.zone/v2/sui/default_token_list", {
          headers: { "Accept": "application/json" },
        });
        
        if (altResponse.ok) {
          const data = await altResponse.json();
          const tokens = data.data || data.result || data.tokens || [];
          
          if (Array.isArray(tokens)) {
            tokens.forEach((token: Record<string, unknown>) => {
              const coinType = token.address || token.coin_type;
              if (coinType && typeof coinType === 'string') {
                priceMap.set(coinType, {
                  coin_type: coinType,
                  price: String(token.price || "0"),
                  symbol: token.symbol as string,
                  decimals: token.decimals as number,
                  logo_url: (token.logo_url || token.icon || token.logoURI) as string,
                });
              }
            });
          }
        }
      } catch (err) {
        console.error("[Cetus] Failed to fetch token list:", err);
      }
    }
    
    return priceMap;
  }, []);

  // Fetch individual token price from DexScreener
  const fetchDexScreenerPrice = useCallback(async (coinType: string): Promise<{ price: number; logo?: string }> => {
    try {
      // Use full coin type for DexScreener
      const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(coinType)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          const price = parseFloat(pair.priceUsd) || 0;
          const logo = pair.info?.imageUrl || null;
          return { price, logo };
        }
      }
    } catch (err) {
      console.error(`[DexScreener] Failed to fetch price for ${coinType}:`, err);
    }
    return { price: 0 };
  }, []);

  // Fetch SUI price specifically
  const fetchSuiPrice = useCallback(async (): Promise<number> => {
    try {
      // Try CoinGecko first
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd"
      );
      if (response.ok) {
        const data = await response.json();
        if (data.sui?.usd) return data.sui.usd;
      }
    } catch {
      console.error("[CoinGecko] Failed to fetch SUI price");
    }
    
    // Fallback to DexScreener
    try {
      const response = await fetch("https://api.dexscreener.com/latest/dex/tokens/sui");
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          return parseFloat(data.pairs[0].priceUsd) || 0.95;
        }
      }
    } catch {
      console.error("[DexScreener] Failed to fetch SUI price");
    }
    
    return 0.95; // Fallback price
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
      
      // Get all coin balances
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

      // Fetch prices from Cetus
      const cetusPrices = await fetchCetusPrices();
      console.log("[TokenBalances] Cetus prices loaded:", cetusPrices.size);

      // Fetch SUI price
      const suiPrice = await fetchSuiPrice();
      console.log("[TokenBalances] SUI price:", suiPrice);

      // Process each token
      const tokenBalances: TokenBalance[] = await Promise.all(
        nonZeroBalances.map(async (balance: CoinBalance) => {
          const coinType = balance.coinType;
          const tokenInfo = getTokenInfo(coinType);
          
          // Get coin objects for this type
          const coins = await client.getCoins({
            owner: account.address,
            coinType: coinType,
          });

          const objectIds = coins.data.map((coin) => coin.coinObjectId);
          const totalBalance = BigInt(balance.totalBalance);
          const decimals = tokenInfo?.decimals || 9;
          
          // Get price and logo
          let priceUSD = 0;
          let logo = tokenInfo?.logo || null;
          
          if (coinType === SUI_TYPE) {
            priceUSD = suiPrice;
          } else {
            // Check Cetus prices first
            const cetusData = cetusPrices.get(coinType);
            if (cetusData && parseFloat(cetusData.price) > 0) {
              priceUSD = parseFloat(cetusData.price);
              if (cetusData.logo_url && !logo) {
                logo = cetusData.logo_url;
              }
            } else {
              // Fallback to DexScreener
              const dexData = await fetchDexScreenerPrice(coinType);
              priceUSD = dexData.price;
              if (dexData.logo && !logo) {
                logo = dexData.logo;
              }
            }
          }

          const balanceFormatted = Number(formatBalance(totalBalance.toString(), decimals));
          const valueUSD = balanceFormatted * priceUSD;

          console.log(`[TokenBalances] ${tokenInfo?.symbol || extractSymbolFromType(coinType)}: balance=${balanceFormatted}, price=$${priceUSD}, value=$${valueUSD}`);

          return {
            coinType,
            symbol: tokenInfo?.symbol || extractSymbolFromType(coinType),
            name: tokenInfo?.name || extractSymbolFromType(coinType),
            balance: totalBalance,
            decimals,
            logo,
            priceUSD,
            valueUSD,
            objectIds,
            isDust: coinType !== SUI_TYPE && isDustToken(valueUSD, dustThreshold),
            selected: false,
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
      setBalances(sortedBalances);
    } catch (err) {
      console.error("[TokenBalances] Error fetching balances:", err);
      setError("Failed to fetch token balances");
    } finally {
      setIsLoading(false);
    }
  }, [client, account?.address, dustThreshold, fetchCetusPrices, fetchSuiPrice, fetchDexScreenerPrice]);

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
