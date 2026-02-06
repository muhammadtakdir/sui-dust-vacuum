"use client";

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useCallback, useMemo } from "react";
import { AggregatorClient } from "@cetusprotocol/aggregator-sdk";
import { TokenBalance, VacuumResult, VacuumState } from "@/types";
import { 
  SUI_TYPE, 
  DEFAULT_GAS_BUDGET, 
  SLIPPAGE_TOLERANCE, 
  CETUS_CONFIG,
  DUST_VACUUM_CONTRACT,
  CLOCK_OBJECT_ID,
} from "@/lib/constants";

/**
 * Normalizes Sui coin types for consistent comparison.
 */
const normalizeCoinType = (type: string): string => {
  if (!type) return "";
  const parts = type.split("::");
  if (parts.length !== 3) return type.toLowerCase();
  
  let addr = parts[0].toLowerCase();
  if (!addr.startsWith("0x")) addr = "0x" + addr;
  if (addr === "0x2") {
    addr = "0x0000000000000000000000000000000000000000000000000000000000000002";
  } else if (addr.length < 66) {
    const hex = addr.slice(2);
    addr = "0x" + hex.padStart(64, '0');
  }
  return `${addr}::${parts[1]}::${parts[2]}`;
};

export interface RouteCheckResult {
  coinType: string;
  symbol: string;
  hasRoute: boolean;
  route: any; 
  estimatedSuiOut: string;
  error?: string;
  suggestedAction?: 'swap' | 'burn' | 'donate';
}

export type TokenAction = 'swap' | 'burn' | 'donate';

interface CoinObject {
  coinType: string;
  coinObjectId: string;
  balance: string;
}

/**
 * Sui Dust Vacuum Hook
 * 
 * Uses @cetusprotocol/aggregator-sdk@1.4.3
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

  // Initialize Aggregator Client using V3 style constructor
  const aggregatorClient = useMemo(() => {
    return new AggregatorClient({
      endpoint: CETUS_CONFIG.mainnet.AGGREGATOR_URL,
      client: client as any,
    });
  }, [client]);

  const getAllCoinObjects = useCallback(async (coinType: string, owner: string) => {
    const allCoins: CoinObject[] = [];
    let cursor: string | null = null;
    do {
      const response = await client.getCoins({ owner, coinType, cursor: cursor ?? undefined });
      allCoins.push(...(response.data as any[]));
      cursor = response.nextCursor ?? null;
    } while (cursor);
    return allCoins;
  }, [client]);

  /**
   * Get swap route using Cetus Aggregator SDK
   */
  const getSwapRoute = useCallback(async (
    fromCoinType: string,
    toCoinType: string,
    amountIn: string
  ) => {
    try {
      if (amountIn === "0" || BigInt(amountIn) <= BigInt(0)) return null;

      const findRouter = await aggregatorClient.findRouters({
        from: normalizeCoinType(fromCoinType),
        target: normalizeCoinType(toCoinType),
        amount: amountIn,
        byAmountIn: true,
      });

      if (!findRouter || findRouter.paths.length === 0) {
        return null;
      }

      return findRouter;
    } catch (error) {
      console.error("[DustVacuum] Aggregator SDK error:", error);
      return null;
    }
  }, [aggregatorClient]);

  const checkRoutes = useCallback(
    async (selectedTokens: TokenBalance[]): Promise<RouteCheckResult[]> => {
      setState("loading");
      setCurrentStep("Checking swap routes via Cetus SDK...");
      const results: RouteCheckResult[] = [];

      for (let i = 0; i < selectedTokens.length; i++) {
        const token = selectedTokens[i];
        if (token.coinType === SUI_TYPE) continue;

        const probeAmount = token.balance > BigInt(0) ? token.balance.toString() : "1000000000";
        const route = await getSwapRoute(token.coinType, SUI_TYPE, probeAmount);
        
        results.push({
          coinType: token.coinType,
          symbol: token.symbol,
          hasRoute: route !== null,
          route,
          estimatedSuiOut: route?.amountOut?.toString() || "0",
          suggestedAction: route ? 'swap' : 'burn',
        });
      }

      setRouteResults(results);
      setState("idle");
      return results;
    },
    [getSwapRoute]
  );

  const burnTokens = useCallback(
    async (tokens: TokenBalance[]): Promise<VacuumResult> => {
      if (!account?.address) return { success: false, tokensSwapped: 0, tokensBurned: 0, totalSuiReceived: "0", totalValueUSD: 0, error: "Wallet not connected" };
      setState("preparing");
      try {
        const tx = new Transaction();
        let totalBurned = 0;
        let totalValueUSD = 0;
        for (const token of tokens) {
          const coins = await getAllCoinObjects(token.coinType, account.address);
          if (coins.length === 0) continue;
          const coinIds = coins.map((c: CoinObject) => c.coinObjectId);
          const [primary, ...rest] = coinIds;
          const primaryObj = tx.object(primary);
          if (rest.length > 0) tx.mergeCoins(primaryObj, rest.map((id: string) => tx.object(id)));
          tx.transferObjects([primaryObj], tx.pure.address("0x0000000000000000000000000000000000000000000000000000000000000000"));
          totalBurned++;
          totalValueUSD += token.valueUSD;
        }
        const txResult = await signAndExecute({ transaction: tx as any });
        await client.waitForTransaction({ digest: txResult.digest });
        setState("success");
        return { success: true, txDigest: txResult.digest, tokensSwapped: 0, tokensBurned: totalBurned, totalSuiReceived: "0", totalValueUSD };
      } catch (error) {
        setState("error");
        return { success: false, tokensSwapped: 0, tokensBurned: 0, totalSuiReceived: "0", totalValueUSD: 0, error: String(error) };
      }
    },
    [account?.address, client, signAndExecute, getAllCoinObjects]
  );

  const donateTokens = useCallback(
    async (tokens: TokenBalance[]): Promise<VacuumResult> => {
      if (!account?.address) return { success: false, tokensSwapped: 0, tokensDonated: 0, totalSuiReceived: "0", totalValueUSD: 0, error: "Wallet not connected" };
      const vaultId = DUST_VACUUM_CONTRACT.mainnet.DUST_VAULT_ID;
      const packageId = DUST_VACUUM_CONTRACT.mainnet.PACKAGE_ID;
      setState("preparing");
      try {
        const tx = new Transaction();
        let totalDonated = 0;
        let totalValueUSD = 0;
        for (const token of tokens) {
          const coins = await getAllCoinObjects(token.coinType, account.address);
          if (coins.length === 0) continue;
          const coinIds = coins.map((c: CoinObject) => c.coinObjectId);
          const [primary, ...rest] = coinIds;
          const primaryObj = tx.object(primary);
          if (rest.length > 0) tx.mergeCoins(primaryObj, rest.map((id: string) => tx.object(id)));
          tx.moveCall({
            target: `${packageId}::vacuum::deposit_dust`,
            typeArguments: [token.coinType],
            arguments: [tx.object(vaultId), primaryObj, tx.pure.u64(Math.floor(token.valueUSD * 1e6).toString()), tx.object(CLOCK_OBJECT_ID)],
          });
          totalDonated++;
          totalValueUSD += token.valueUSD;
        }
        const txResult = await signAndExecute({ transaction: tx as any });
        await client.waitForTransaction({ digest: txResult.digest });
        setState("success");
        return { success: true, txDigest: txResult.digest, tokensSwapped: 0, tokensDonated: totalDonated, totalSuiReceived: "0", totalValueUSD };
      } catch (error) {
        setState("error");
        return { success: false, tokensSwapped: 0, tokensDonated: 0, totalSuiReceived: "0", totalValueUSD: 0, error: String(error) };
      }
    },
    [account?.address, client, signAndExecute, getAllCoinObjects]
  );

  const vacuum = useCallback(
    async (selectedTokens: TokenBalance[]): Promise<VacuumResult> => {
      if (!account?.address) return { success: false, tokensSwapped: 0, totalSuiReceived: "0", totalValueUSD: 0, error: "Wallet not connected" };
      setState("preparing");
      try {
        const tokensWithRoutes: any[] = [];
        for (const token of selectedTokens) {
          if (token.coinType === SUI_TYPE) continue;
          const totalBalance = token.balance;
          if (totalBalance > BigInt(0)) {
            const route = await getSwapRoute(token.coinType, SUI_TYPE, totalBalance.toString());
            if (route) {
              const coins = await getAllCoinObjects(token.coinType, account.address);
              tokensWithRoutes.push({ token, coins, totalBalance, route });
            }
          }
        }

        if (tokensWithRoutes.length === 0) {
          setState("error");
          return { success: false, tokensSwapped: 0, totalSuiReceived: "0", totalValueUSD: 0, error: "No swappable tokens found." };
        }

        const tx = new Transaction();
        tx.setGasBudget(DEFAULT_GAS_BUDGET);
        let totalValueUSD = 0;

        for (const { token, coins, route } of tokensWithRoutes) {
          const coinIds = coins.map((c: CoinObject) => c.coinObjectId);
          const [primary, ...rest] = coinIds;
          const coinToSwap = tx.object(primary);
          if (rest.length > 0) tx.mergeCoins(coinToSwap, rest.map((id: string) => tx.object(id)));
          
          // Use SDK to build the swap transaction
          // Capture the output coin!
          const targetCoin = await aggregatorClient.routerSwap({
            router: route,
            txb: tx,
            inputCoin: coinToSwap,
            slippage: SLIPPAGE_TOLERANCE / 100, // 0.005 for 0.5%
          });

          // IMPORTANT: Transfer the output coin to the user
          // routerSwap creates the swap commands but might not transfer the result automatically
          // unless fastRouterSwap is used. Since we want to compose with logging,
          // we use routerSwap and handle the transfer manually.
          if (targetCoin) {
            tx.transferObjects([targetCoin], account.address);
          }

          const packageId = DUST_VACUUM_CONTRACT.mainnet.PACKAGE_ID;
          if (packageId) {
            tx.moveCall({
              target: `${packageId}::vacuum::log_individual_swap`,
              typeArguments: [token.coinType],
              arguments: [
                tx.pure.u64(token.balance.toString()), 
                tx.pure.u64(route.amountOut.toString()), 
                tx.object(CLOCK_OBJECT_ID)
              ],
            });
          }
          totalValueUSD += token.valueUSD;
        }

        const txResult = await signAndExecute({ transaction: tx as any });
        const confirmed = await client.waitForTransaction({ digest: txResult.digest, options: { showBalanceChanges: true } });
        let totalSuiReceived = BigInt(0);
        confirmed.balanceChanges?.forEach((change: any) => {
          if (change.coinType === SUI_TYPE && (change.owner as any)?.AddressOwner === account.address) {
            const amt = BigInt(change.amount);
            if (amt > 0) totalSuiReceived += amt;
          }
        });
        setState("success");
        return { success: true, txDigest: txResult.digest, tokensSwapped: tokensWithRoutes.length, totalSuiReceived: totalSuiReceived.toString(), totalValueUSD };
      } catch (error) {
        console.error("[Vacuum] SDK Swap failed:", error);
        setState("error");
        return { success: false, tokensSwapped: 0, totalSuiReceived: "0", totalValueUSD: 0, error: String(error) };
      }
    },
    [account?.address, client, signAndExecute, getAllCoinObjects, getSwapRoute, aggregatorClient]
  );

  const reset = useCallback(() => {
    setState("idle");
    setProgress(0);
    setCurrentStep("");
    setResult(null);
    setRouteResults([]);
  }, []);

  return { state, progress, currentStep, result, routeResults, vacuum, burnTokens, donateTokens, checkRoutes, reset };
}