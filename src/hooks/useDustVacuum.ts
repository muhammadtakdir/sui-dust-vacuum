"use client";

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useCallback } from "react";
import { TokenBalance, VacuumResult, VacuumState } from "@/types";
import { 
  SUI_TYPE, 
  DEFAULT_GAS_BUDGET, 
  SLIPPAGE_TOLERANCE, 
  CETUS_CONFIG,
  DUST_VACUUM_CONTRACT,
  CLOCK_OBJECT_ID,
} from "@/lib/constants";

interface AggregatorRoute {
  amountIn: string;
  amountOut: string;
  priceImpact?: number;
  routes: Array<{
    poolAddress: string;
    a2b: boolean;
    coinTypeA: string;
    coinTypeB: string;
  }>;
}

export interface RouteCheckResult {
  coinType: string;
  symbol: string;
  hasRoute: boolean;
  route: AggregatorRoute | null;
  estimatedSuiOut: string;
  error?: string;
}

/**
 * Sui Dust Vacuum Hook
 * 
 * Purpose: Clean up wallet by swapping ALL dust token balances to SUI in ONE transaction.
 * 
 * Problem solved: 
 * - Users have many small "dust" balances ($0.03, $0.10, etc.)
 * - Manual swapping is impossible because gas > dust value
 * - This hook batches ALL into one PTB transaction
 * 
 * Goal: Token balance becomes EXACTLY 0 after vacuum
 */
export function useDustVacuum() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [state, setState] = useState<VacuumState>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [result, setResult] = useState<VacuumResult | null>(null);
  const [routeResults, setRouteResults] = useState<RouteCheckResult[]>([]);

  /**
   * Fetch ALL coin objects for a specific type
   * Critical for ensuring we get the COMPLETE balance
   */
  const getAllCoinObjects = async (coinType: string, owner: string) => {
    const allCoins: Awaited<ReturnType<typeof client.getCoins>>["data"] = [];
    let cursor: string | null = null;
    
    do {
      const response = await client.getCoins({
        owner,
        coinType,
        cursor: cursor ?? undefined,
      });
      allCoins.push(...response.data);
      cursor = response.nextCursor ?? null;
    } while (cursor);
    
    return allCoins;
  };

  /**
   * Get swap route from Cetus Aggregator API
   */
  const getSwapRoute = async (
    fromCoinType: string,
    toCoinType: string,
    amountIn: string
  ): Promise<AggregatorRoute | null> => {
    try {
      // Skip if amount is 0
      if (amountIn === "0" || BigInt(amountIn) <= BigInt(0)) {
        return null;
      }

      const params = new URLSearchParams({
        from: fromCoinType,
        target: toCoinType,
        amount: amountIn,
        by_amount_in: "true",
      });

      console.log(`[Cetus] Fetching: ${fromCoinType} → ${toCoinType}, amount: ${amountIn}`);

      const response = await fetch(`${CETUS_CONFIG.mainnet.AGGREGATOR_URL}?${params}`, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        console.error(`[Cetus] HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      console.log(`[Cetus] Response:`, JSON.stringify(data, null, 2));

      const result = data.result || data.data || data;
      if (!result) return null;

      const routes = result.routes || result.path || [];
      if (!routes || routes.length === 0) return null;

      return {
        amountIn: result.amount_in || result.amountIn || amountIn,
        amountOut: result.amount_out || result.amountOut || "0",
        priceImpact: result.price_impact || result.priceImpact,
        routes: routes.map((r: Record<string, unknown>) => ({
          poolAddress: String(r.pool_id || r.poolAddress || r.pool || ""),
          a2b: Boolean(r.a_to_b ?? r.a2b ?? true),
          coinTypeA: String(r.coin_type_a || r.coinTypeA || r.tokenA || ""),
          coinTypeB: String(r.coin_type_b || r.coinTypeB || r.tokenB || ""),
        })),
      };
    } catch (error) {
      console.error("[Cetus] Error:", error);
      return null;
    }
  };

  /**
   * Pre-check routes for UI feedback
   */
  const checkRoutes = useCallback(
    async (selectedTokens: TokenBalance[]): Promise<RouteCheckResult[]> => {
      setState("loading");
      setCurrentStep("Checking swap routes...");
      setProgress(0);

      const results: RouteCheckResult[] = [];

      for (let i = 0; i < selectedTokens.length; i++) {
        const token = selectedTokens[i];
        setProgress(Math.floor((i / selectedTokens.length) * 100));
        setCurrentStep(`Checking ${token.symbol}...`);

        if (token.coinType === SUI_TYPE) continue;

        const route = await getSwapRoute(token.coinType, SUI_TYPE, token.balance.toString());

        results.push({
          coinType: token.coinType,
          symbol: token.symbol,
          hasRoute: route !== null,
          route,
          estimatedSuiOut: route?.amountOut || "0",
          error: route ? undefined : `No liquidity for ${token.symbol} → SUI`,
        });
      }

      setRouteResults(results);
      setState("idle");
      setProgress(0);
      setCurrentStep("");

      return results;
    },
    []
  );

  /**
   * MAIN VACUUM FUNCTION
   * 
   * Steps:
   * 1. Fetch ALL coin objects (not just what we have cached)
   * 2. Check routes for each token
   * 3. Build single PTB that merges ALL coins and swaps ENTIRE balance
   * 4. Execute and confirm
   * 
   * Result: Token balance = 0
   */
  const vacuum = useCallback(
    async (selectedTokens: TokenBalance[]): Promise<VacuumResult> => {
      if (!account?.address) {
        return {
          success: false,
          tokensSwapped: 0,
          totalSuiReceived: "0",
          totalValueUSD: 0,
          error: "Wallet not connected",
        };
      }

      if (selectedTokens.length === 0) {
        return {
          success: false,
          tokensSwapped: 0,
          totalSuiReceived: "0",
          totalValueUSD: 0,
          error: "No tokens selected",
        };
      }

      setState("preparing");
      setProgress(5);
      setCurrentStep("Fetching complete coin data...");

      try {
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: Get FRESH, COMPLETE coin data for each token
        // ═══════════════════════════════════════════════════════════════
        interface TokenData {
          token: TokenBalance;
          coins: Awaited<ReturnType<typeof getAllCoinObjects>>;
          totalBalance: bigint;
        }
        
        const tokenDataMap = new Map<string, TokenData>();

        for (const token of selectedTokens) {
          if (token.coinType === SUI_TYPE) continue;

          // Get ALL coins of this type (pagination handled)
          const coins = await getAllCoinObjects(token.coinType, account.address);
          const totalBalance = coins.reduce((sum, c) => sum + BigInt(c.balance), BigInt(0));

          console.log(`[Vacuum] ${token.symbol}: ${coins.length} coins, total: ${totalBalance}`);

          if (totalBalance > BigInt(0)) {
            tokenDataMap.set(token.coinType, { token, coins, totalBalance });
          }
        }

        if (tokenDataMap.size === 0) {
          setState("error");
          return {
            success: false,
            tokensSwapped: 0,
            totalSuiReceived: "0",
            totalValueUSD: 0,
            error: "No tokens with balance found",
          };
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 2: Check routes for all tokens
        // ═══════════════════════════════════════════════════════════════
        setProgress(15);
        setCurrentStep("Finding best swap routes...");

        interface TokenWithRoute extends TokenData {
          coinType: string;
          route: AggregatorRoute;
        }

        const tokensWithRoutes: TokenWithRoute[] = [];
        const failedTokens: string[] = [];
        const routeChecks: RouteCheckResult[] = [];

        const tokenEntries = Array.from(tokenDataMap.entries());
        for (let idx = 0; idx < tokenEntries.length; idx++) {
          const [coinType, data] = tokenEntries[idx];
          setProgress(15 + Math.floor(((idx + 1) / tokenEntries.length) * 25));
          setCurrentStep(`Checking route for ${data.token.symbol}...`);

          const route = await getSwapRoute(coinType, SUI_TYPE, data.totalBalance.toString());

          if (route && route.routes.length > 0) {
            tokensWithRoutes.push({ ...data, coinType, route });
            routeChecks.push({
              coinType,
              symbol: data.token.symbol,
              hasRoute: true,
              route,
              estimatedSuiOut: route.amountOut,
            });
          } else {
            failedTokens.push(data.token.symbol);
            routeChecks.push({
              coinType,
              symbol: data.token.symbol,
              hasRoute: false,
              route: null,
              estimatedSuiOut: "0",
              error: `No liquidity pool for ${data.token.symbol} → SUI on Cetus`,
            });
          }
        }

        setRouteResults(routeChecks);

        if (tokensWithRoutes.length === 0) {
          setState("error");
          const r: VacuumResult = {
            success: false,
            tokensSwapped: 0,
            totalSuiReceived: "0",
            totalValueUSD: 0,
            error: `No swap routes on Cetus for: ${failedTokens.join(", ")}`,
            failedTokens,
          };
          setResult(r);
          return r;
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Build single PTB with ALL swaps
        // ═══════════════════════════════════════════════════════════════
        setProgress(45);
        setCurrentStep("Building vacuum transaction...");

        const tx = new Transaction();
        tx.setGasBudget(DEFAULT_GAS_BUDGET);

        let totalValueUSD = 0;

        for (const { coinType, token, coins, totalBalance, route } of tokensWithRoutes) {
          console.log(`[PTB] Adding ${token.symbol}: ${totalBalance} (${coins.length} objects)`);

          // Get coin IDs
          const coinIds = coins.map(c => c.coinObjectId);

          // CRITICAL: Create merged coin variable
          // This merges ALL coins so we swap the ENTIRE balance → balance becomes 0
          let coinToSwap;
          
          if (coinIds.length === 1) {
            // Single coin - use directly
            coinToSwap = tx.object(coinIds[0]);
          } else {
            // Multiple coins - MERGE ALL into first
            const [primary, ...rest] = coinIds;
            coinToSwap = tx.object(primary);
            tx.mergeCoins(coinToSwap, rest.map(id => tx.object(id)));
          }

          // Calculate min output with slippage tolerance
          const minAmountOut = BigInt(
            Math.floor(Number(route.amountOut) * (1 - SLIPPAGE_TOLERANCE / 100))
          );

          // Build swap call(s) based on route
          const poolPackage = CETUS_CONFIG.mainnet.CLMM_PACKAGE;
          
          if (route.routes.length === 1) {
            // Single-hop swap
            const step = route.routes[0];
            const swapFn = step.a2b ? "swap_a2b" : "swap_b2a";
            const sqrtPriceLimit = step.a2b 
              ? "79226673515401279992447579055" 
              : "4295048016";

            tx.moveCall({
              target: `${poolPackage}::pool_script_v2::${swapFn}`,
              typeArguments: [step.coinTypeA, step.coinTypeB],
              arguments: [
                tx.object(CETUS_CONFIG.mainnet.GLOBAL_CONFIG_ID),
                tx.object(step.poolAddress),
                coinToSwap,
                tx.pure.bool(true), // by_amount_in = TRUE (use FULL input amount)
                tx.pure.u64(totalBalance.toString()), // ENTIRE balance
                tx.pure.u64(minAmountOut.toString()),
                tx.pure.u128(sqrtPriceLimit),
                tx.object("0x6"), // Clock object
              ],
            });
          } else {
            // Multi-hop: Execute each step
            // Note: For multi-hop, we need to handle intermediate coins
            // This is a simplified version - in production, use Cetus Router
            for (let i = 0; i < route.routes.length; i++) {
              const step = route.routes[i];
              const swapFn = step.a2b ? "swap_a2b" : "swap_b2a";
              const sqrtPriceLimit = step.a2b 
                ? "79226673515401279992447579055" 
                : "4295048016";
              const isFirst = i === 0;
              const isLast = i === route.routes.length - 1;

              tx.moveCall({
                target: `${poolPackage}::pool_script_v2::${swapFn}`,
                typeArguments: [step.coinTypeA, step.coinTypeB],
                arguments: [
                  tx.object(CETUS_CONFIG.mainnet.GLOBAL_CONFIG_ID),
                  tx.object(step.poolAddress),
                  isFirst ? coinToSwap : tx.gas, // Output from previous swap
                  tx.pure.bool(true),
                  tx.pure.u64(isFirst ? totalBalance.toString() : "0"),
                  tx.pure.u64(isLast ? minAmountOut.toString() : "0"),
                  tx.pure.u128(sqrtPriceLimit),
                  tx.object("0x6"),
                ],
              });
            }
          }

          totalValueUSD += token.valueUSD;

          // ═══════════════════════════════════════════════════════════════
          // Log each swap to the Dust Vacuum smart contract (mainnet)
          // ═══════════════════════════════════════════════════════════════
          const packageId = DUST_VACUUM_CONTRACT.mainnet.PACKAGE_ID;
          if (packageId) {
            tx.moveCall({
              target: `${packageId}::vacuum::log_individual_swap`,
              typeArguments: [coinType],
              arguments: [
                tx.pure.u64(totalBalance.toString()),
                tx.pure.u64(route.amountOut), // estimated SUI received
                tx.object(CLOCK_OBJECT_ID),
              ],
            });
            console.log(`[PTB] Added log_individual_swap for ${token.symbol}`);
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Execute transaction
        // ═══════════════════════════════════════════════════════════════
        setState("swapping");
        setProgress(60);
        setCurrentStep(`Vacuuming ${tokensWithRoutes.length} token${tokensWithRoutes.length > 1 ? 's' : ''}...`);

        console.log("[Vacuum] Executing transaction...");

        const txResult = await signAndExecute({
          transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
        });

        setProgress(85);
        setCurrentStep("Confirming on chain...");

        // Wait for confirmation
        const confirmed = await client.waitForTransaction({
          digest: txResult.digest,
          options: {
            showEffects: true,
            showBalanceChanges: true,
          },
        });

        console.log("[Vacuum] Confirmed:", txResult.digest);

        // Calculate SUI received from balance changes
        let totalSuiReceived = BigInt(0);
        if (confirmed.balanceChanges) {
          for (const change of confirmed.balanceChanges) {
            if (
              change.coinType === SUI_TYPE &&
              change.owner &&
              typeof change.owner === "object" &&
              "AddressOwner" in change.owner &&
              change.owner.AddressOwner === account.address
            ) {
              const amt = BigInt(change.amount);
              if (amt > 0) totalSuiReceived += amt;
            }
          }
        }

        // ═══════════════════════════════════════════════════════════════
        // SUCCESS!
        // ═══════════════════════════════════════════════════════════════
        setState("success");
        setProgress(100);
        setCurrentStep("✨ All dust cleared!");

        const successResult: VacuumResult = {
          success: true,
          txDigest: txResult.digest,
          tokensSwapped: tokensWithRoutes.length,
          totalSuiReceived: totalSuiReceived.toString(),
          totalValueUSD,
          failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
        };

        setResult(successResult);
        return successResult;

      } catch (error) {
        console.error("[Vacuum] Error:", error);
        setState("error");

        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        const errorResult: VacuumResult = {
          success: false,
          tokensSwapped: 0,
          totalSuiReceived: "0",
          totalValueUSD: 0,
          error: errorMsg,
        };

        setResult(errorResult);
        return errorResult;
      }
    },
    [account?.address, client, signAndExecute]
  );

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setCurrentStep("");
    setResult(null);
    setRouteResults([]);
  }, []);

  return {
    state,
    progress,
    currentStep,
    result,
    routeResults,
    vacuum,
    checkRoutes,
    reset,
  };
}
