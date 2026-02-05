"use client";

import { motion } from "framer-motion";
import { RefreshCw, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useTokenBalances } from "@/hooks";
import { useDustDAO } from "@/hooks/useDustDAO";
import { VaultStats } from "./VaultStats";
import { DepositPanel } from "./DepositPanel";
import { RewardsPanel } from "./RewardsPanel";
import { AdminPanel } from "./AdminPanel";
import { GovernancePanel } from "./GovernancePanel";
import { SuccessAnimation } from "@/components/effects/SuccessAnimation";
import { DEFAULT_DUST_THRESHOLD_USD, SUI_EXPLORER_TX_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DustDAOPoolProps {
  dustThreshold?: number;
}

export function DustDAOPool({ dustThreshold = DEFAULT_DUST_THRESHOLD_USD }: DustDAOPoolProps) {
  const account = useCurrentAccount();
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  
  const {
    balances,
    isLoading: isLoadingBalances,
    fetchBalances,
    toggleSelection,
    selectAllDust,
    deselectAll,
    selectedTokens,
    dustTokens,
  } = useTokenBalances(dustThreshold);

  // Fetch balances when component mounts and account is available
  useEffect(() => {
    const doFetch = async () => {
      if (account?.address) {
        console.log('[DustDAOPool] Account connected:', account.address);
        console.log('[DustDAOPool] Current dustTokens:', dustTokens.length);
        console.log('[DustDAOPool] Current balances:', balances.length);
        console.log('[DustDAOPool] Threshold:', dustThreshold);
        
        await fetchBalances();
        setInitialFetchDone(true);
      }
    };
    
    doFetch();
  }, [account?.address]);

  // Also re-fetch when threshold changes
  useEffect(() => {
    if (account?.address && initialFetchDone) {
      console.log('[DustDAOPool] Threshold changed to:', dustThreshold);
      fetchBalances();
    }
  }, [dustThreshold]);

  // Debug log when dustTokens changes
  useEffect(() => {
    console.log('[DustDAOPool] dustTokens updated:', dustTokens.length, dustTokens.map(t => t.symbol));
  }, [dustTokens]);

  const {
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
    createTokenVault,
    newRound,
    refresh,
    reset,
  } = useDustDAO();

  // Handle deposit
  const handleDeposit = async () => {
    if (selectedTokens.length === 0) return;
    
    // For now, we'll use a simple approach - in production, you'd query token vault IDs
    // This is a placeholder - token vaults need to be created by admin first
    const tokenVaultIds: Record<string, string> = {
      // These would be fetched from chain or stored in config
      // Example: "0x...::cetus::CETUS": "0x...tokenVaultId"
    };

    // Show warning if no token vaults configured
    console.warn("[DustDAO] Token vaults need to be created by admin first");
    
    await depositDust(selectedTokens, tokenVaultIds);
  };

  // Handle close modal
  const handleClose = () => {
    reset();
    fetchBalances();
    refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h2 className="text-2xl font-bold mb-1">DustDAO Pool</h2>
          <p className="text-sui-muted">
            Pool your dust with the community for gas-efficient batch swaps
          </p>
        </div>

        <button
          onClick={() => {
            fetchBalances();
            refresh();
          }}
          disabled={isLoading || isLoadingBalances}
          className="p-2 rounded-xl border border-sui-border hover:border-sui-blue transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-5 h-5", (isLoading || isLoadingBalances) && "animate-spin")} />
        </button>
      </motion.div>

      {/* Vault Stats */}
      <VaultStats 
        vaultInfo={vaultInfo}
        userShares={userShares}
        isLoading={isLoading}
      />

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Deposit */}
        <div className="space-y-6">
          <DepositPanel
            dustTokens={dustTokens}
            selectedTokens={selectedTokens}
            isVaultOpen={vaultInfo?.isOpen ?? false}
            isDepositing={state === "depositing"}
            onToggleSelection={toggleSelection}
            onSelectAll={selectAllDust}
            onDeselectAll={deselectAll}
            onDeposit={handleDeposit}
          />

          {/* Admin Panel (only visible to admin) */}
          <AdminPanel
            vaultInfo={vaultInfo}
            isAdmin={isAdmin}
            isLoading={state === "admin-action"}
            onOpenVault={openVault}
            onCloseVault={closeVault}
            onNewRound={newRound}
            onCreateTokenVault={createTokenVault}
          />
        </div>

        {/* Right Column - Rewards & Governance */}
        <div className="space-y-6">
          <RewardsPanel
            vaultInfo={vaultInfo}
            membership={membership}
            receipts={receipts}
            isClaiming={state === "claiming"}
            isStaking={state === "staking"}
            onClaim={claimRewards}
            onStake={stakeRewards}
            onCreateMembership={createMembership}
          />

          <GovernancePanel
            proposals={proposals}
            membership={membership}
            isVoting={state === "voting"}
            onVote={voteOnProposal}
          />
        </div>
      </div>

      {/* How It Works */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="font-semibold mb-4">How DustDAO Pool Works</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-sui-blue/20 text-sui-blue font-bold flex items-center justify-center mx-auto mb-2">
              1
            </div>
            <p className="font-medium text-sm">Deposit Dust</p>
            <p className="text-xs text-sui-muted mt-1">
              Pool your small token balances
            </p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-sui-purple/20 text-sui-purple font-bold flex items-center justify-center mx-auto mb-2">
              2
            </div>
            <p className="font-medium text-sm">Batch Swap</p>
            <p className="text-xs text-sui-muted mt-1">
              Admin swaps all dust to SUI
            </p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-sui-success/20 text-sui-success font-bold flex items-center justify-center mx-auto mb-2">
              3
            </div>
            <p className="font-medium text-sm">Claim Rewards</p>
            <p className="text-xs text-sui-muted mt-1">
              Get SUI proportional to your share
            </p>
          </div>
          <div className="text-center p-4">
            <div className="w-10 h-10 rounded-full bg-sui-warning/20 text-sui-warning font-bold flex items-center justify-center mx-auto mb-2">
              4
            </div>
            <p className="font-medium text-sm">Earn & Vote</p>
            <p className="text-xs text-sui-muted mt-1">
              Auto-stake + governance rights
            </p>
          </div>
        </div>
      </motion.div>

      {/* Success/Error Modal */}
      {(state === "success" || state === "error") && result && (
        <SuccessAnimation 
          result={{
            success: result.success,
            txDigest: result.txDigest,
            tokensSwapped: 0,
            totalSuiReceived: "0",
            totalValueUSD: 0,
            error: result.error,
          }}
          onClose={handleClose}
          customMessage={result.message}
        />
      )}
    </div>
  );
}
