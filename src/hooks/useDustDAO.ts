"use client";

import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useCallback, useEffect } from "react";
import { 
  DUST_VACUUM_CONTRACT,
  CLOCK_OBJECT_ID,
  SUI_DECIMALS,
} from "@/lib/constants";
import { TokenBalance } from "@/types";
import { 
  VaultInfo, 
  UserShares, 
  MembershipInfo, 
  DepositReceiptInfo,
  ProposalInfo,
  PoolModeState,
  PoolModeResult,
  ADMIN_WALLET,
  MAX_DUST_VALUE_USD,
  MIN_DUST_VALUE_USD,
} from "@/types/dustdao";

const PACKAGE_ID = DUST_VACUUM_CONTRACT.mainnet.PACKAGE_ID;
const DUST_VAULT_ID = DUST_VACUUM_CONTRACT.mainnet.DUST_VAULT_ID;
const ADMIN_CAP_ID = DUST_VACUUM_CONTRACT.mainnet.ADMIN_CAP_ID;

/**
 * DustDAO Pool Mode Hook
 * 
 * Provides all functionality for interacting with the DustDAO smart contract:
 * - View vault info and user shares
 * - Deposit dust tokens to community vault
 * - Claim or stake rewards
 * - Admin functions (batch swap, open/close vault)
 * - Governance voting
 */
export function useDustDAO() {
  const client = useSuiClient();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  // State
  const [state, setState] = useState<PoolModeState>("idle");
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userShares, setUserShares] = useState<UserShares | null>(null);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [receipts, setReceipts] = useState<DepositReceiptInfo[]>([]);
  const [proposals, setProposals] = useState<ProposalInfo[]>([]);
  const [result, setResult] = useState<PoolModeResult | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    if (account?.address) {
      setIsAdmin(account.address.toLowerCase() === ADMIN_WALLET.toLowerCase());
    } else {
      setIsAdmin(false);
    }
  }, [account?.address]);

  /**
   * Fetch vault info from chain
   */
  const fetchVaultInfo = useCallback(async () => {
    if (!DUST_VAULT_ID) return;

    try {
      setIsLoading(true);
      const vaultObject = await client.getObject({
        id: DUST_VAULT_ID,
        options: { showContent: true },
      });

      if (vaultObject.data?.content?.dataType === "moveObject") {
        const fields = vaultObject.data.content.fields as Record<string, unknown>;
        
        setVaultInfo({
          admin: fields.admin as string,
          totalShares: BigInt((fields.total_shares as string) || "0"),
          suiRewards: BigInt((fields.sui_rewards as { fields?: { value?: string } })?.fields?.value || "0"),
          stakedSui: BigInt((fields.staked_sui as { fields?: { value?: string } })?.fields?.value || "0"),
          round: parseInt((fields.round as string) || "1"),
          isOpen: fields.is_open as boolean,
          depositorsCount: parseInt((fields.depositors_count as string) || "0"),
          totalLifetimeShares: BigInt((fields.total_lifetime_shares as string) || "0"),
          totalFeesCollected: BigInt((fields.total_fees_collected as string) || "0"),
        });
      }
    } catch (error) {
      console.error("[DustDAO] Failed to fetch vault info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Fetch user's shares in the vault
   * Note: We get this from the vault's dynamic fields or events
   * For simplicity, we'll track shares locally after deposits
   */
  const fetchUserShares = useCallback(async () => {
    if (!account?.address || !vaultInfo) return;

    try {
      // Try to get user shares from vault's Table
      // Since Tables are not directly readable, we estimate from receipts
      // In production, you'd use a custom view function or indexer
      
      // For now, calculate from receipts
      const totalReceiptShares = receipts.reduce((sum, r) => sum + r.shares, BigInt(0));
      const sharesUSD = Number(totalReceiptShares) / 1e6;
      const percentage = vaultInfo.totalShares > 0 
        ? (Number(totalReceiptShares) / Number(vaultInfo.totalShares)) * 100 
        : 0;

      setUserShares({ 
        shares: BigInt(totalReceiptShares), 
        sharesUSD, 
        percentage 
      });
    } catch (error) {
      console.error("[DustDAO] Failed to fetch user shares:", error);
      setUserShares({ shares: BigInt(0), sharesUSD: 0, percentage: 0 });
    }
  }, [account?.address, vaultInfo, receipts]);

  /**
   * Fetch user's DustDAO membership NFT
   */
  const fetchMembership = useCallback(async () => {
    if (!account?.address) return;

    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::vacuum::DustDAOMembership`,
        },
        options: { showContent: true },
      });

      if (objects.data.length > 0 && objects.data[0].data?.content?.dataType === "moveObject") {
        const obj = objects.data[0].data;
        const content = obj.content;
        if (content && 'fields' in content) {
          const fields = content.fields as Record<string, unknown>;
          
          setMembership({
            objectId: obj.objectId,
            member: fields.member as string,
            lifetimeShares: BigInt((fields.lifetime_shares as string) || "0"),
            totalSuiEarned: BigInt((fields.total_sui_earned as string) || "0"),
            stakedAmount: BigInt((fields.staked_amount as string) || "0"),
            rewardPreference: parseInt((fields.reward_preference as string) || "0"),
            joinedAtMs: parseInt((fields.joined_at_ms as string) || "0"),
          });
        }
      } else {
        setMembership(null);
      }
    } catch (error) {
      console.error("[DustDAO] Failed to fetch membership:", error);
    }
  }, [client, account?.address]);

  /**
   * Fetch user's deposit receipts
   */
  const fetchReceipts = useCallback(async () => {
    if (!account?.address) return;

    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::vacuum::DepositReceipt`,
        },
        options: { showContent: true },
      });

      const receiptList: DepositReceiptInfo[] = objects.data
        .filter(o => o.data?.content?.dataType === "moveObject")
        .map(o => {
          const obj = o.data!;
          const content = obj.content as { dataType: "moveObject"; fields: Record<string, unknown> };
          const fields = content.fields;
          return {
            objectId: obj.objectId,
            depositor: fields.depositor as string,
            shares: BigInt((fields.shares as string) || "0"),
            round: parseInt((fields.round as string) || "1"),
            rewardPreference: parseInt((fields.reward_preference as string) || "0"),
          };
        });

      setReceipts(receiptList);
    } catch (error) {
      console.error("[DustDAO] Failed to fetch receipts:", error);
    }
  }, [client, account?.address]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await fetchVaultInfo();
    if (account?.address) {
      await Promise.all([
        fetchUserShares(),
        fetchMembership(),
        fetchReceipts(),
      ]);
    }
  }, [fetchVaultInfo, fetchUserShares, fetchMembership, fetchReceipts, account?.address]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Deposit dust tokens to the vault
   * 
   * SECURITY: USD value validation
   * - Rejects deposits with USD value > MAX_DUST_VALUE_USD ($100)
   * - Rejects deposits with USD value < MIN_DUST_VALUE_USD ($0.001)
   * - This prevents manipulation attacks where users claim inflated USD values
   */
  const depositDust = useCallback(async (
    tokens: TokenBalance[],
    tokenVaultIds: Record<string, string>, // coinType -> tokenVaultId
  ) => {
    if (!account?.address || tokens.length === 0) return;

    try {
      setState("depositing");
      setResult(null);

      // SECURITY: Validate total deposit value
      const totalUsdValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
      if (totalUsdValue > MAX_DUST_VALUE_USD) {
        throw new Error(`Total deposit value ($${totalUsdValue.toFixed(2)}) exceeds maximum allowed ($${MAX_DUST_VALUE_USD}). This is a dust vacuum - only small balances are allowed.`);
      }

      const tx = new Transaction();
      let validTokenCount = 0;

      for (const token of tokens) {
        const tokenVaultId = tokenVaultIds[token.coinType];
        if (!tokenVaultId) {
          console.warn(`[DustDAO] No token vault for ${token.symbol}`);
          continue;
        }

        // SECURITY: Validate individual token USD value
        if (token.valueUSD > MAX_DUST_VALUE_USD) {
          console.warn(`[DustDAO] Skipping ${token.symbol}: USD value ($${token.valueUSD.toFixed(2)}) exceeds maximum`);
          continue;
        }
        if (token.valueUSD < MIN_DUST_VALUE_USD) {
          console.warn(`[DustDAO] Skipping ${token.symbol}: USD value too low`);
          continue;
        }

        // Get all coins of this type
        const coins = await client.getCoins({
          owner: account.address,
          coinType: token.coinType,
        });

        if (coins.data.length === 0) continue;

        // Merge coins if multiple
        let coinToDeposit;
        if (coins.data.length === 1) {
          coinToDeposit = tx.object(coins.data[0].coinObjectId);
        } else {
          const [primary, ...rest] = coins.data.map(c => tx.object(c.coinObjectId));
          if (rest.length > 0) {
            tx.mergeCoins(primary, rest);
          }
          coinToDeposit = primary;
        }

        // USD value scaled by 1e6
        // SECURITY: Cap the value to prevent overflow and manipulation
        const cappedUsdValue = Math.min(token.valueUSD, MAX_DUST_VALUE_USD);
        const usdValueScaled = Math.floor(cappedUsdValue * 1e6);

        // Deposit to vault
        tx.moveCall({
          target: `${PACKAGE_ID}::vacuum::deposit_dust`,
          typeArguments: [token.coinType],
          arguments: [
            tx.object(DUST_VAULT_ID),
            tx.object(tokenVaultId),
            coinToDeposit,
            tx.pure.u64(usdValueScaled),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
        
        validTokenCount++;
      }

      if (validTokenCount === 0) {
        throw new Error("No valid tokens to deposit. Check token values.");
      }

      // Create receipt at the end
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::create_receipt`,
        arguments: [
          tx.object(DUST_VAULT_ID),
          tx.pure.u8(0), // reward_preference: 0 = Claim
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "deposit",
        message: `Deposited ${tokens.length} token(s) to DustDAO pool`,
      });

      // Refresh data
      await refresh();

    } catch (error) {
      console.error("[DustDAO] Deposit failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "deposit",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [account?.address, client, signAndExecute, refresh]);

  /**
   * Claim SUI rewards
   */
  const claimRewards = useCallback(async (receiptId: string) => {
    if (!account?.address || !membership) return;

    try {
      setState("claiming");
      setResult(null);

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::claim_rewards`,
        arguments: [
          tx.object(DUST_VAULT_ID),
          tx.object(receiptId),
          tx.object(membership.objectId),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "claim",
        message: "Successfully claimed SUI rewards!",
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] Claim failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "claim",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [account?.address, membership, signAndExecute, client, refresh]);

  /**
   * Stake rewards (auto-stake)
   */
  const stakeRewards = useCallback(async (receiptId: string) => {
    if (!account?.address || !membership) return;

    try {
      setState("staking");
      setResult(null);

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::stake_rewards`,
        arguments: [
          tx.object(DUST_VAULT_ID),
          tx.object(receiptId),
          tx.object(membership.objectId),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "stake",
        message: "Successfully staked rewards!",
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] Stake failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "stake",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [account?.address, membership, signAndExecute, client, refresh]);

  /**
   * Create membership NFT
   */
  const createMembership = useCallback(async () => {
    if (!account?.address) return;

    try {
      setState("loading");

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::create_membership`,
        arguments: [
          tx.object(DUST_VAULT_ID),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("idle");
      await fetchMembership();

    } catch (error) {
      console.error("[DustDAO] Create membership failed:", error);
      setState("error");
    }
  }, [account?.address, signAndExecute, client, fetchMembership]);

  /**
   * Vote on proposal
   */
  const voteOnProposal = useCallback(async (proposalId: string, voteFor: boolean) => {
    if (!account?.address || !membership) return;

    try {
      setState("voting");
      setResult(null);

      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::vote`,
        arguments: [
          tx.object(proposalId),
          tx.object(membership.objectId),
          tx.pure.bool(voteFor),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "vote",
        message: `Vote cast successfully!`,
      });

    } catch (error) {
      console.error("[DustDAO] Vote failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "vote",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [account?.address, membership, signAndExecute, client]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Open vault for deposits (Admin only)
   */
  const openVault = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setState("admin-action");
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::open_vault`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(DUST_VAULT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "admin",
        message: "Vault opened for deposits",
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] Open vault failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "admin",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isAdmin, signAndExecute, client, refresh]);

  /**
   * Close vault for deposits (Admin only)
   */
  const closeVault = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setState("admin-action");
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::close_vault`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(DUST_VAULT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "admin",
        message: "Vault closed for deposits",
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] Close vault failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "admin",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isAdmin, signAndExecute, client, refresh]);

  /**
   * Create token vault (Admin only)
   */
  const createTokenVault = useCallback(async (coinType: string) => {
    if (!isAdmin) return;

    try {
      setState("admin-action");
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::create_token_vault`,
        typeArguments: [coinType],
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(DUST_VAULT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "admin",
        message: `Token vault created for ${coinType}`,
      });

    } catch (error) {
      console.error("[DustDAO] Create token vault failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "admin",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isAdmin, signAndExecute, client]);

  /**
   * Start new round (Admin only)
   */
  const newRound = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setState("admin-action");
      
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::new_round`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(DUST_VAULT_ID),
        ],
      });

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "admin",
        message: "New round started",
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] New round failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "admin",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isAdmin, signAndExecute, client, refresh]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
  }, []);

  return {
    // State
    state,
    result,
    isLoading,
    isAdmin,

    // Data
    vaultInfo,
    userShares,
    membership,
    receipts,
    proposals,

    // User actions
    depositDust,
    claimRewards,
    stakeRewards,
    createMembership,
    voteOnProposal,

    // Admin actions
    openVault,
    closeVault,
    createTokenVault,
    newRound,

    // Utils
    refresh,
    reset,
  };
}
