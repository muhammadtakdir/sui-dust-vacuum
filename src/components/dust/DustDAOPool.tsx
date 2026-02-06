"use client";

import { motion } from "framer-motion";
import { RefreshCw, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useDustDAO } from "@/hooks/useDustDAO";
import { VaultStats } from "./VaultStats";
import { DepositPanel } from "./DepositPanel";
import { RewardsPanel } from "./RewardsPanel";
import { AdminPanel } from "./AdminPanel";
import { GovernancePanel } from "./GovernancePanel";
import { SuccessAnimation } from "@/components/effects/SuccessAnimation";
import { DEFAULT_DUST_THRESHOLD_USD, SUI_EXPLORER_TX_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TokenBalance } from "@/types";

interface DustDAOPoolProps {
  dustThreshold?: number;
  // Pass balances from parent to share state
  sharedDustTokens?: TokenBalance[];
  sharedBalances?: TokenBalance[];
  onRefresh?: () => void;
}

export function DustDAOPool({ 
  dustThreshold = DEFAULT_DUST_THRESHOLD_USD,
  sharedDustTokens,
  sharedBalances,
  onRefresh,
}: DustDAOPoolProps) {
  const account = useCurrentAccount();
  const [localSelectedCoinTypes, setLocalSelectedCoinTypes] = useState<Set<string>>(new Set());
  
  // Use shared dust tokens from parent if provided
  const rawDustTokens = sharedDustTokens || [];
  const balances = sharedBalances || [];
  const isLoadingBalances = false;

  // Create dustTokens with selection state merged
  const dustTokens = rawDustTokens.map(token => ({
    ...token,
    selected: localSelectedCoinTypes.has(token.coinType),
  }));

  // Local selection management
  const toggleSelection = (coinType: string) => {
    setLocalSelectedCoinTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(coinType)) {
        newSet.delete(coinType);
      } else {
        newSet.add(coinType);
      }
      return newSet;
    });
  };

  const selectAllDust = () => {
    setLocalSelectedCoinTypes(new Set(rawDustTokens.map(t => t.coinType)));
  };

  const deselectAll = () => {
    setLocalSelectedCoinTypes(new Set());
  };

  // Get selected tokens with full data
  const selectedTokens = rawDustTokens.filter(t => localSelectedCoinTypes.has(t.coinType));
  
  const fetchBalances = () => {
    onRefresh?.();
  };

  // Debug log when dustTokens changes
  useEffect(() => {
    console.log('[DustDAOPool] dustTokens from parent:', dustTokens.length, dustTokens.map(t => t.symbol));
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
    setTargetUsdValue,
    refresh,
    reset,
  } = useDustDAO();

  // Handle deposit - use unified deposit function
  const handleDeposit = async () => {
    if (selectedTokens.length === 0) {
      console.warn("[DustDAO] No tokens selected");
      return;
    }
    
    console.log("[DustDAO] Depositing tokens:", selectedTokens.map(t => t.symbol));
    
    // Use unified deposit function
    // This deposits tokens to the unified Bag storage and mints receipt
    await depositDust(selectedTokens);
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
            onSetTarget={setTargetUsdValue}
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
