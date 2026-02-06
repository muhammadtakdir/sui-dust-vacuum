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
 * - Admin functions (batch swap, open/close vault, set target)
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
          totalShares: BigInt((fields.current_round_shares as string) || "0"),
          suiRewards: BigInt(0), // v3: Rewards are now in round history
          stakedSui: BigInt((fields.staked_sui as { fields?: { value?: string } })?.fields?.value || "0"),
          round: parseInt((fields.round as string) || "1"),
          isOpen: fields.is_open as boolean,
          depositorsCount: parseInt((fields.depositors_count as string) || "0"),
          totalLifetimeShares: BigInt((fields.total_lifetime_shares as string) || "0"),
          totalFeesCollected: BigInt((fields.total_fees_collected as string) || "0"),
          targetUsdValue: BigInt((fields.target_usd_value as string) || "0"),
          currentUsdValue: BigInt((fields.current_usd_value as string) || "0"),
        });
      }
    } catch (error) {
      console.error("[DustDAO] Failed to fetch vault info:", error);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Fetch user membership info
   */
  const fetchMembership = useCallback(async () => {
    if (!account?.address) {
      setMembership(null);
      return;
    }

    try {
      const objects = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${PACKAGE_ID}::vacuum::DustDAOMembership`,
        },
        options: { showContent: true },
      });

      if (objects.data.length > 0) {
        const obj = objects.data[0].data!;
        const content = obj.content as { dataType: "moveObject"; fields: Record<string, unknown> };
        const fields = content.fields;
        
        setMembership({
          objectId: obj.objectId,
          member: fields.member as string,
          lifetimeShares: BigInt((fields.lifetime_shares as string) || "0"),
          totalSuiEarned: BigInt((fields.total_sui_earned as string) || "0"),
          stakedAmount: BigInt((fields.staked_amount as string) || "0"),
          rewardPreference: parseInt((fields.reward_preference as string) || "0"),
          joinedAtMs: parseInt((fields.joined_at_ms as string) || "0"),
        });
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
    if (!account?.address) {
      setReceipts([]);
      return;
    }

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
          };
        });

      setReceipts(receiptList);
    } catch (error) {
      console.error("[DustDAO] Failed to fetch receipts:", error);
    }
  }, [client, account?.address]);

  /**
   * Fetch governance proposals
   */
  const fetchProposals = useCallback(async () => {
    try {
      // Placeholder for proposal fetching logic
    } catch (error) {
      console.error("[DustDAO] Failed to fetch proposals:", error);
    }
  }, []);

  /**
   * Calculate user shares in the current round
   */
  const calculateUserShares = useCallback(() => {
    if (!vaultInfo) return;

    // Calculate shares from active receipts (for current round)
    const currentRoundReceipts = receipts.filter(r => r.round === vaultInfo.round);
    const roundShares = currentRoundReceipts.reduce((sum, r) => sum + r.shares, BigInt(0));
    
    // USD value (shares / 1e6)
    const sharesUSD = Number(roundShares) / 1e6;
    
    // Percentage
    const totalShares = vaultInfo.totalShares;
    const percentage = totalShares > BigInt(0) 
      ? (Number(roundShares) / Number(totalShares)) * 100 
      : 0;

    setUserShares({
      shares: roundShares,
      sharesUSD,
      percentage,
    });
  }, [vaultInfo, receipts]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchVaultInfo(),
      fetchMembership(),
      fetchReceipts(),
      fetchProposals(),
    ]);
    setIsLoading(false);
  }, [fetchVaultInfo, fetchMembership, fetchReceipts, fetchProposals]);

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update user shares when receipts or vault info change
  useEffect(() => {
    calculateUserShares();
  }, [calculateUserShares]);

  /**
   * Unified Deposit Function
   */
  const depositDust = useCallback(async (
    tokens: TokenBalance[],
  ) => {
    if (!account?.address || tokens.length === 0) return;

    try {
      setState("depositing");
      setResult(null);

      const totalUsdValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);
      if (totalUsdValue > MAX_DUST_VALUE_USD) {
        throw new Error(`Total deposit value ($${totalUsdValue.toFixed(2)}) exceeds maximum allowed ($${MAX_DUST_VALUE_USD}).`);
      }

      const tx = new Transaction();
      let validTokenCount = 0;
      const depositedTokens: string[] = [];

      for (const token of tokens) {
        if (token.valueUSD > MAX_DUST_VALUE_USD || token.valueUSD < MIN_DUST_VALUE_USD) {
          continue;
        }

        const coins = await client.getCoins({
          owner: account.address,
          coinType: token.coinType,
        });

        if (coins.data.length === 0) continue;

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

        const usdValueScaled = Math.floor(token.valueUSD * 1e6);

        tx.moveCall({
          target: `${PACKAGE_ID}::vacuum::deposit_dust`,
          typeArguments: [token.coinType],
          arguments: [
            tx.object(DUST_VAULT_ID),
            coinToDeposit,
            tx.pure.u64(usdValueScaled),
            tx.object(CLOCK_OBJECT_ID),
          ],
        });
        
        validTokenCount++;
        depositedTokens.push(token.symbol);
      }

      if (validTokenCount === 0) {
        throw new Error("No valid tokens to deposit.");
      }

      const txResult = await signAndExecute({
        transaction: tx as unknown as Parameters<typeof signAndExecute>[0]["transaction"],
      });

      await client.waitForTransaction({ digest: txResult.digest });

      setState("success");
      setResult({
        success: true,
        txDigest: txResult.digest,
        action: "deposit",
        message: `Deposited ${depositedTokens.join(", ")} to DustDAO pool`,
      });

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

      const [membership] = tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::create_membership`,
        arguments: [
          tx.object(DUST_VAULT_ID),
          tx.object(CLOCK_OBJECT_ID),
        ],
      });

      // Transfer the created membership object back to the user
      tx.transferObjects([membership], account.address);

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

  /**
   * Admin: Set Target USD Value
   */
  const setTargetUsdValue = useCallback(async (value: number) => {
    if (!isAdmin) return;

    try {
      setState("admin-action");
      
      const tx = new Transaction();
      // Scale by 1e6
      const scaledValue = BigInt(Math.floor(value * 1e6));
      
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::set_target_usd_value`,
        arguments: [
          tx.object(ADMIN_CAP_ID),
          tx.object(DUST_VAULT_ID),
          tx.pure.u64(scaledValue.toString()),
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
        message: `Target value updated to $${value}`,
      });

      await refresh();

    } catch (error) {
      console.error("[DustDAO] Set target value failed:", error);
      setState("error");
      setResult({
        success: false,
        action: "admin",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [isAdmin, signAndExecute, client, refresh]);

  /**
   * Admin: Open vault
   */
  const openVault = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setState("admin-action");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::open_vault`,
        arguments: [tx.object(ADMIN_CAP_ID), tx.object(DUST_VAULT_ID)],
      });
      const txResult = await signAndExecute({ transaction: tx as any });
      await client.waitForTransaction({ digest: txResult.digest });
      setState("success");
      await refresh();
    } catch (error) {
      console.error("[DustDAO] Open vault failed:", error);
      setState("error");
    }
  }, [isAdmin, signAndExecute, client, refresh]);

  /**
   * Admin: Close vault
   */
  const closeVault = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setState("admin-action");
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::vacuum::close_vault`,
        arguments: [tx.object(ADMIN_CAP_ID), tx.object(DUST_VAULT_ID)],
      });
      const txResult = await signAndExecute({ transaction: tx as any });
      await client.waitForTransaction({ digest: txResult.digest });
      setState("success");
      await refresh();
    } catch (error) {
      console.error("[DustDAO] Close vault failed:", error);
      setState("error");
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
    state,
    result,
    isLoading,
    isAdmin,
    vaultInfo,
    userShares,
    membership,
    receipts,
    proposals,
    depositDust,
    claimRewards,
    stakeRewards,
    createMembership,
    voteOnProposal,
    openVault,
    closeVault,
    setTargetUsdValue,
    refresh,
    reset,
  };
}
