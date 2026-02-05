"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Shield, 
  Lock, 
  Unlock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Plus,
  Play,
} from "lucide-react";
import { VaultInfo } from "@/types/dustdao";
import { formatUSD, cn } from "@/lib/utils";
import { SUI_DECIMALS, ADMIN_FEE_BPS } from "@/lib/constants";

interface AdminPanelProps {
  vaultInfo: VaultInfo | null;
  isAdmin: boolean;
  isLoading: boolean;
  onOpenVault: () => void;
  onCloseVault: () => void;
  onNewRound: () => void;
  onCreateTokenVault: (coinType: string) => void;
}

export function AdminPanel({
  vaultInfo,
  isAdmin,
  isLoading,
  onOpenVault,
  onCloseVault,
  onNewRound,
  onCreateTokenVault,
}: AdminPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [newTokenType, setNewTokenType] = useState("");

  if (!isAdmin) return null;

  const totalFeesFormatted = vaultInfo 
    ? Number(vaultInfo.totalFeesCollected) / Math.pow(10, SUI_DECIMALS)
    : 0;

  return (
    <motion.div
      className="card border-2 border-sui-warning/50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-sui-warning" />
          Admin Panel
          <span className="px-2 py-0.5 bg-sui-warning/20 text-sui-warning text-xs rounded-full">
            Admin Only
          </span>
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
            {/* Warning */}
            <div className="p-3 bg-sui-warning/10 border border-sui-warning/30 rounded-xl mb-4">
              <div className="flex items-start gap-2 text-sui-warning text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  These actions affect all users in the pool. Use with caution.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3 bg-sui-darker rounded-xl">
                <p className="text-sm text-sui-muted">Total Fees Collected</p>
                <p className="font-bold text-sui-success">
                  {totalFeesFormatted.toFixed(4)} SUI
                </p>
              </div>
              <div className="p-3 bg-sui-darker rounded-xl">
                <p className="text-sm text-sui-muted">Fee Rate</p>
                <p className="font-bold text-sui-warning">
                  {ADMIN_FEE_BPS / 100}%
                </p>
              </div>
            </div>

            {/* Vault Controls */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-sui-muted">Vault Controls</p>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Open Vault */}
                <button
                  onClick={onOpenVault}
                  disabled={isLoading || vaultInfo?.isOpen}
                  className={cn(
                    "py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all",
                    !vaultInfo?.isOpen && !isLoading
                      ? "bg-sui-success/20 text-sui-success hover:bg-sui-success/30"
                      : "bg-sui-darker text-sui-muted cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                  <span>Open Vault</span>
                </button>

                {/* Close Vault */}
                <button
                  onClick={onCloseVault}
                  disabled={isLoading || !vaultInfo?.isOpen}
                  className={cn(
                    "py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all",
                    vaultInfo?.isOpen && !isLoading
                      ? "bg-sui-danger/20 text-sui-danger hover:bg-sui-danger/30"
                      : "bg-sui-darker text-sui-muted cursor-not-allowed"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>Close Vault</span>
                </button>
              </div>

              {/* New Round */}
              <button
                onClick={onNewRound}
                disabled={isLoading || vaultInfo?.isOpen}
                className={cn(
                  "w-full py-3 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all",
                  !vaultInfo?.isOpen && !isLoading
                    ? "bg-sui-blue/20 text-sui-blue hover:bg-sui-blue/30"
                    : "bg-sui-darker text-sui-muted cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Start New Round</span>
              </button>
            </div>

            {/* Create Token Vault */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-sui-muted">Create Token Vault</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTokenType}
                  onChange={(e) => setNewTokenType(e.target.value)}
                  placeholder="0x...::coin::COIN"
                  className="flex-1 px-4 py-2 bg-sui-darker border border-sui-border rounded-xl text-sm focus:outline-none focus:border-sui-blue"
                />
                <button
                  onClick={() => {
                    if (newTokenType) {
                      onCreateTokenVault(newTokenType);
                      setNewTokenType("");
                    }
                  }}
                  disabled={isLoading || !newTokenType}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all",
                    newTokenType && !isLoading
                      ? "bg-sui-gradient hover:opacity-90"
                      : "bg-sui-darker text-sui-muted cursor-not-allowed"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  <span>Create</span>
                </button>
              </div>
              
              <p className="text-xs text-sui-muted">
                Create a new token vault before users can deposit that token type.
              </p>
            </div>

            {/* Batch Swap Info */}
            <div className="mt-6 p-4 bg-sui-darker rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-sui-blue" />
                Batch Swap Workflow
              </h4>
              <ol className="text-sm text-sui-muted space-y-1 list-decimal list-inside">
                <li>Close vault (stops new deposits)</li>
                <li>Withdraw tokens from each TokenVault</li>
                <li>Swap tokens to SUI via Cetus (in PTB)</li>
                <li>Call deposit_sui_rewards_with_fee (auto 2% fee)</li>
                <li>Start new round</li>
              </ol>
              <p className="text-xs text-sui-muted mt-3">
                Note: Batch swap requires custom PTB construction. Use CLI or dedicated script.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
