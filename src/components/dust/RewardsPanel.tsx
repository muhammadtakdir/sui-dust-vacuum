"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Gift, 
  TrendingUp, 
  Wallet,
  ChevronDown,
  ChevronUp,
  Loader2,
  Award,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { DepositReceiptInfo, MembershipInfo, VaultInfo } from "@/types/dustdao";
import { formatUSD, cn } from "@/lib/utils";
import { SUI_DECIMALS } from "@/lib/constants";

interface RewardsPanelProps {
  vaultInfo: VaultInfo | null;
  membership: MembershipInfo | null;
  receipts: DepositReceiptInfo[];
  isClaiming: boolean;
  isStaking: boolean;
  onClaim: (receiptId: string) => void;
  onStake: (receiptId: string) => void;
  onCreateMembership: () => void;
}

export function RewardsPanel({
  vaultInfo,
  membership,
  receipts,
  isClaiming,
  isStaking,
  onClaim,
  onStake,
  onCreateMembership,
}: RewardsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter receipts
  const currentRound = vaultInfo?.round ?? 1;
  const claimableReceipts = receipts.filter(r => r.round < currentRound);
  const pendingReceipts = receipts.filter(r => r.round === currentRound);

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="w-5 h-5 text-sui-success" />
          Your Rewards
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-sui-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-sui-muted" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Membership Card */}
            {membership ? (
              <div className="p-4 bg-sui-gradient/10 border border-sui-blue/30 rounded-xl mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-sui-gradient flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">DustDAO Member</p>
                    <p className="text-xs text-sui-muted">
                      Since {new Date(membership.joinedAtMs).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-sui-muted">Lifetime Shares</p>
                    <p className="font-semibold">
                      {formatUSD(Number(membership.lifetimeShares) / 1e6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sui-muted">Total Earned</p>
                    <p className="font-semibold text-sui-success">
                      {(Number(membership.totalSuiEarned) / Math.pow(10, SUI_DECIMALS)).toFixed(4)} SUI
                    </p>
                  </div>
                  <div>
                    <p className="text-sui-muted">Staked</p>
                    <p className="font-semibold text-sui-blue">
                      {(Number(membership.stakedAmount) / Math.pow(10, SUI_DECIMALS)).toFixed(4)} SUI
                    </p>
                  </div>
                  <div>
                    <p className="text-sui-muted">Voting Power</p>
                    <p className="font-semibold">
                      {(Number(membership.lifetimeShares) / 1e6).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-sui-darker rounded-xl mb-4 text-center">
                <Award className="w-8 h-8 text-sui-muted mx-auto mb-2" />
                <p className="text-sui-muted text-sm mb-3">No membership found</p>
                <button
                  onClick={onCreateMembership}
                  className="px-4 py-2 bg-sui-gradient rounded-lg text-sm font-medium hover:opacity-90"
                >
                  Create Membership
                </button>
              </div>
            )}

            {/* Claimable Rewards */}
            <div className="space-y-3 mb-6">
              <h4 className="text-sm font-medium text-sui-muted flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sui-success" />
                Claimable Rewards
              </h4>
              
              {claimableReceipts.length > 0 ? (
                claimableReceipts.map((receipt) => (
                  <div key={receipt.objectId} className="p-4 bg-sui-darker rounded-xl border border-sui-success/20">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-sm text-sui-success">Round #{receipt.round} Finalized</p>
                        <p className="text-xs text-sui-muted">Value: {formatUSD(Number(receipt.shares) / 1e6)}</p>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 bg-sui-success/10 text-sui-success text-[10px] rounded-full font-bold">READY</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onClaim(receipt.objectId)}
                        disabled={isClaiming || isStaking || !membership}
                        className={cn(
                          "py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                          !isClaiming && !isStaking && membership
                            ? "bg-sui-success/20 text-sui-success hover:bg-sui-success/30"
                            : "bg-sui-darker text-sui-muted cursor-not-allowed"
                        )}
                      >
                        {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                        <span>Claim SUI</span>
                      </button>
                      <button
                        onClick={() => onStake(receipt.objectId)}
                        disabled={isClaiming || isStaking || !membership}
                        className={cn(
                          "py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2",
                          !isClaiming && !isStaking && membership
                            ? "bg-sui-blue/20 text-sui-blue hover:bg-sui-blue/30"
                            : "bg-sui-darker text-sui-muted cursor-not-allowed"
                        )}
                      >
                        {isStaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                        <span>Stake</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-sui-darker/50 rounded-xl text-center">
                  <p className="text-xs text-sui-muted">No claimable rewards available</p>
                </div>
              )}
            </div>

            {/* Pending Rewards */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-sui-muted flex items-center gap-2">
                <Clock className="w-4 h-4 text-sui-warning" />
                Active Deposits (Round #{currentRound})
              </h4>
              
              {pendingReceipts.length > 0 ? (
                pendingReceipts.map((receipt) => (
                  <div key={receipt.objectId} className="p-4 bg-sui-darker rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">Active Receipt</p>
                        <p className="text-xs text-sui-muted">Value: {formatUSD(Number(receipt.shares) / 1e6)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-sui-warning font-bold uppercase">Collecting...</p>
                        <p className="text-[10px] text-sui-muted mt-1">Claimable after batch swap</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-sui-darker/50 rounded-xl text-center">
                  <p className="text-xs text-sui-muted">No active deposits in this round</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 p-3 bg-sui-darker rounded-xl border border-sui-border/50">
              <p className="text-xs text-sui-muted leading-relaxed">
                <span className="text-white font-medium">💡 Info:</span> Your deposits are locked in the smart contract. Rewards become available only after the admin completes the batch swap for the round.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}