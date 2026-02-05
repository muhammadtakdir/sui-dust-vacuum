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

interface BlockberryToken {
  coinType: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl?: string;
  price?: number;
  priceChangePercentage24H?: number;
  balance?: string;
  objects?: number;
  usdValue?: number;
  verified?: boolean;
}

export function useTokenBalances(dustThreshold: number = DEFAULT_DUST_THRESHOLD_USD) {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch token data from Blockberry API (same as Sui Wallet uses)
  const fetchBlockberryTokens = useCallback(async (address: string): Promise<Map<string, BlockberryToken>> => {
    const tokenMap = new Map<string, BlockberryToken>();
    
    try {
      // Blockberry API - this is what Sui Wallet uses
      const response = await fetch(
        `https://api.blockberry.one/sui/v1/accounts/${address}/coins?page=0&size=50`,
        {
          headers: { 
            "Accept": "application/json",
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log("[Blockberry] Response:", data);
        
        const tokens = data.content || data.data || data;
        if (Array.isArray(tokens)) {
          tokens.forEach((token: BlockberryToken) => {
            if (token.coinType) {
              tokenMap.set(token.coinType, token);
            }
          });
        }
      }
    } catch (err) {
      console.error("[Blockberry] Failed to fetch:", err);
    }
    
    // If Blockberry fails, try SuiVision API
    if (tokenMap.size === 0) {
      try {
        const response = await fetch(
          `https://api.suivision.xyz/api/account/${address}/coins`,
          {
            headers: { 
              "Accept": "application/json",
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          console.log("[SuiVision] Response:", data);
          
          const tokens = data.data || data.result || data;
          if (Array.isArray(tokens)) {
            tokens.forEach((token: Record<string, unknown>) => {
              const coinType = token.coinType || token.type;
              if (coinType && typeof coinType === 'string') {
                tokenMap.set(coinType, {
                  coinType: coinType,
                  name: (token.name || token.symbol) as string,
                  symbol: token.symbol as string,
                  decimals: (token.decimals as number) || 9,
                  iconUrl: (token.iconUrl || token.icon || token.logo) as string,
                  price: token.price as number,
                  balance: token.balance as string,
                  usdValue: token.usdValue as number,
                });
              }
            });
          }
        }
      } catch (err) {
        console.error("[SuiVision] Failed to fetch:", err);
      }
    }
    
    return tokenMap;
  }, []);

  // Fetch token prices from alternative sources
  const fetchTokenPrices = useCallback(async (coinTypes: string[]): Promise<Map<string, number>> => {
    const priceMap = new Map<string, number>();
    
    // Try fetching prices from multiple sources
    for (const coinType of coinTypes) {
      if (coinType === SUI_TYPE) continue;
      
      try {
        // Try DexScreener
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(coinType)}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.pairs && data.pairs.length > 0) {
            const price = parseFloat(data.pairs[0].priceUsd) || 0;
            if (price > 0) {
              priceMap.set(coinType, price);
              console.log(`[DexScreener] ${coinType}: $${price}`);
            }
          }
        }
      } catch (err) {
        // Ignore individual price fetch errors
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return priceMap;
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
      
      // Fetch from Blockberry first (has price data)
      const blockberryData = await fetchBlockberryTokens(account.address);
      console.log("[TokenBalances] Blockberry data:", blockberryData.size, "tokens");
      
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

      // Get coin types that need price lookup
      const coinTypesNeedingPrices: string[] = [];
      nonZeroBalances.forEach((balance: CoinBalance) => {
        if (balance.coinType !== SUI_TYPE && !blockberryData.has(balance.coinType)) {
          coinTypesNeedingPrices.push(balance.coinType);
        }
      });

      // Fetch additional prices if needed
      const additionalPrices = coinTypesNeedingPrices.length > 0 
        ? await fetchTokenPrices(coinTypesNeedingPrices.slice(0, 10)) // Limit to 10 to avoid rate limiting
        : new Map<string, number>();

      // Fetch SUI price
      const suiPrice = await fetchSuiPrice();
      console.log("[TokenBalances] SUI price:", suiPrice);

      // Process each token
      const tokenBalances: TokenBalance[] = await Promise.all(
        nonZeroBalances.map(async (balance: CoinBalance) => {
          const coinType = balance.coinType;
          const tokenInfo = getTokenInfo(coinType);
          const blockberryToken = blockberryData.get(coinType);
          
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
          
          // Use decimals from chain metadata (most accurate), then Blockberry, token info, or default to 9
          const decimals = chainMetadata?.decimals ?? blockberryToken?.decimals ?? tokenInfo?.decimals ?? 9;
          
          // Get price and logo
          let priceUSD = 0;
          let logo = chainMetadata?.iconUrl || tokenInfo?.logo || blockberryToken?.iconUrl || null;
          
          if (coinType === SUI_TYPE) {
            priceUSD = suiPrice;
          } else if (blockberryToken?.price && blockberryToken.price > 0) {
            // Use Blockberry price (most accurate, same as wallet shows)
            priceUSD = blockberryToken.price;
            console.log(`[Blockberry] ${blockberryToken.symbol}: price=$${priceUSD}`);
          } else if (additionalPrices.has(coinType)) {
            priceUSD = additionalPrices.get(coinType) || 0;
          }

          const balanceFormatted = Number(formatBalance(totalBalance.toString(), decimals));
          
          // Use Blockberry's USD value if available, otherwise calculate
          let valueUSD = blockberryToken?.usdValue || (balanceFormatted * priceUSD);
          
          // Get symbol and name from multiple sources (chain metadata is most accurate)
          const symbol = chainMetadata?.symbol || blockberryToken?.symbol || tokenInfo?.symbol || extractSymbolFromType(coinType);
          const name = chainMetadata?.name || blockberryToken?.name || tokenInfo?.name || symbol;

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
  }, [client, account?.address, dustThreshold, fetchBlockberryTokens, fetchTokenPrices, fetchSuiPrice]);

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
