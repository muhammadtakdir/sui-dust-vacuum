"use client";

import { motion } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  Users, 
  Lock, 
  Unlock,
  DollarSign,
} from "lucide-react";
import { VaultInfo, UserShares } from "@/types/dustdao";
import { formatUSD, cn } from "@/lib/utils";
import { SUI_DECIMALS } from "@/lib/constants";

interface VaultStatsProps {
  vaultInfo: VaultInfo | null;
  userShares: UserShares | null;
  isLoading?: boolean;
}

export function VaultStats({ vaultInfo, userShares, isLoading }: VaultStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-sui-border rounded w-20 mb-2" />
            <div className="h-6 bg-sui-border rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!vaultInfo) {
    return (
      <div className="card text-center py-8">
        <p className="text-sui-muted">Unable to load vault information</p>
      </div>
    );
  }

  const suiRewardsFormatted = Number(vaultInfo.suiRewards) / Math.pow(10, SUI_DECIMALS);
  const stakedSuiFormatted = Number(vaultInfo.stakedSui) / Math.pow(10, SUI_DECIMALS);
  
  const currentUsd = vaultInfo.currentUsdValue ? Number(vaultInfo.currentUsdValue) / 1e6 : 0;
  const targetUsd = vaultInfo.targetUsdValue ? Number(vaultInfo.targetUsdValue) / 1e6 : 0;
  const progressPercent = targetUsd > 0 ? Math.min((currentUsd / targetUsd) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Vault Status */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 text-sui-muted text-sm mb-1">
            {vaultInfo.isOpen ? (
              <Unlock className="w-4 h-4 text-sui-success" />
            ) : (
              <Lock className="w-4 h-4 text-sui-danger" />
            )}
            <span>Vault Status</span>
          </div>
          <p className={cn(
            "font-bold text-lg",
            vaultInfo.isOpen ? "text-sui-success" : "text-sui-danger"
          )}>
            {vaultInfo.isOpen ? "Open" : "Closed"}
          </p>
          <p className="text-xs text-sui-muted mt-1">Round #{vaultInfo.round}</p>
        </motion.div>

        {/* Total Pool Value */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2 text-sui-muted text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Pool Value</span>
          </div>
          <p className="font-bold text-lg text-sui-warning">
            {formatUSD(currentUsd)}
          </p>
          
          {targetUsd > 0 ? (
            <div className="mt-2">
               <div className="flex justify-between text-xs mb-1">
                 <span className="text-sui-muted">Progress</span>
                 <span className="text-sui-blue">{progressPercent.toFixed(0)}%</span>
               </div>
               <div className="h-1.5 bg-sui-darker rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-sui-blue"
                   initial={{ width: 0 }}
                   animate={{ width: `${progressPercent}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                 />
               </div>
               <p className="text-[10px] text-sui-muted mt-1 text-right">Target: ${targetUsd}</p>
            </div>
          ) : (
             <p className="text-xs text-sui-muted mt-1">{vaultInfo.depositorsCount} depositors</p>
          )}
        </motion.div>

        {/* SUI Rewards Pool */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 text-sui-muted text-sm mb-1">
            <Wallet className="w-4 h-4" />
            <span>SUI Rewards</span>
          </div>
          <p className="font-bold text-lg text-sui-blue">
            {suiRewardsFormatted.toFixed(4)} SUI
          </p>
          <p className="text-xs text-sui-muted mt-1">Available to claim</p>
        </motion.div>

        {/* Staked SUI */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 text-sui-muted text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Staked SUI</span>
          </div>
          <p className="font-bold text-lg text-sui-success">
            {stakedSuiFormatted.toFixed(4)} SUI
          </p>
          <p className="text-xs text-sui-muted mt-1">Earning yield</p>
        </motion.div>
      </div>

      {/* User's Position */}
      {userShares && userShares.shares > BigInt(0) && (
        <motion.div
          className="card bg-sui-gradient/10 border-sui-blue/30"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sui-muted text-sm mb-1">
                <Users className="w-4 h-4" />
                <span>Your Position</span>
              </div>
              <p className="font-bold text-xl">
                {formatUSD(userShares.sharesUSD)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-sui-muted">Pool Share</p>
              <p className="font-bold text-lg text-sui-blue">
                {userShares.percentage.toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Estimated reward */}
          {vaultInfo.suiRewards > BigInt(0) && (
            <div className="mt-4 pt-4 border-t border-sui-border">
              <div className="flex justify-between items-center">
                <span className="text-sui-muted text-sm">Estimated Reward</span>
                <span className="font-semibold text-sui-success">
                  ~{(suiRewardsFormatted * userShares.percentage / 100).toFixed(4)} SUI
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}