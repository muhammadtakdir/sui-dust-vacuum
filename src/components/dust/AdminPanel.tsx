"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Shield, 
  Lock, 
  Unlock, 
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Play,
  Target,
} from "lucide-react";
import { VaultInfo } from "@/types/dustdao";
import { cn } from "@/lib/utils";
import { SUI_DECIMALS, ADMIN_FEE_BPS } from "@/lib/constants";

interface AdminPanelProps {
  vaultInfo: VaultInfo | null;
  isAdmin: boolean;
  isLoading: boolean;
  onOpenVault: () => void;
  onCloseVault: () => void;
  onSetTarget: (value: number) => void;
}

export function AdminPanel({
  vaultInfo,
  isAdmin,
  isLoading,
  onOpenVault,
  onCloseVault,
  onSetTarget,
}: AdminPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [targetInput, setTargetInput] = useState("");

  if (!isAdmin) return null;

  const totalFeesFormatted = vaultInfo 
    ? Number(vaultInfo.totalFeesCollected) / Math.pow(10, SUI_DECIMALS)
    : 0;
    
  const currentTarget = vaultInfo?.targetUsdValue 
    ? Number(vaultInfo.targetUsdValue) / 1e6 
    : 0;

  const handleSetTarget = () => {
    const val = parseFloat(targetInput);
    if (!isNaN(val) && val > 0) {
      onSetTarget(val);
      setTargetInput("");
    }
  };

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
            
            {/* Target Setting */}
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-sui-muted">Campaign Settings</p>
              <div className="p-3 bg-sui-darker rounded-xl">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-sui-muted">Current Target</span>
                    <span className="font-bold text-sui-blue">${currentTarget.toFixed(2)}</span>
                 </div>
                 <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Set new target (USD)"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      className="flex-1 bg-black/20 border border-sui-border rounded-lg px-3 py-2 text-sm focus:border-sui-blue outline-none"
                    />
                    <button
                      onClick={handleSetTarget}
                      disabled={isLoading || !targetInput}
                      className="bg-sui-blue/20 text-sui-blue hover:bg-sui-blue/30 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Set
                    </button>
                 </div>
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
            </div>

            {/* Batch Swap Info */}
            <div className="mt-6 p-4 bg-sui-darker rounded-xl">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Play className="w-4 h-4 text-sui-blue" />
                Batch Swap Workflow
              </h4>
              <ol className="text-sm text-sui-muted space-y-1 list-decimal list-inside">
                <li>Set Target USD Value (e.g. $100)</li>
                <li>Wait for users to fill the vault</li>
                <li>Close vault (stops new deposits)</li>
                <li>Execute Batch Swap (via CLI/Script)</li>
                <li>Call deposit_sui_rewards (auto 2% fee + new round)</li>
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