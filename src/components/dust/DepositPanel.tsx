"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { TokenBalance } from "@/types";
import { TokenCard } from "./TokenCard";
import { formatUSD, cn } from "@/lib/utils";

interface DepositPanelProps {
  dustTokens: TokenBalance[];
  selectedTokens: TokenBalance[];
  isVaultOpen: boolean;
  isDepositing: boolean;
  onToggleSelection: (coinType: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDeposit: () => void;
}

export function DepositPanel({
  dustTokens,
  selectedTokens,
  isVaultOpen,
  isDepositing,
  onToggleSelection,
  onSelectAll,
  onDeselectAll,
  onDeposit,
}: DepositPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const totalSelectedValue = selectedTokens.reduce((sum, t) => sum + t.valueUSD, 0);

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
          <Upload className="w-5 h-5 text-sui-blue" />
          Deposit Dust to Pool
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
            {/* Vault Status Warning */}
            {!isVaultOpen && (
              <div className="mb-4 p-3 bg-sui-warning/10 border border-sui-warning/30 rounded-xl">
                <div className="flex items-start gap-2 text-sui-warning text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Vault is currently closed</p>
                    <p className="text-xs text-sui-muted mt-1">
                      Wait for admin to open the vault or claim rewards from previous round
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Token Selection */}
            {dustTokens.length > 0 ? (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={onSelectAll}
                    className="text-sm text-sui-blue hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-sui-muted">|</span>
                  <button
                    onClick={onDeselectAll}
                    className="text-sm text-sui-muted hover:text-white"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                  {dustTokens.map((token, index) => (
                    <TokenCard
                      key={token.coinType}
                      token={token}
                      onSelect={() => onToggleSelection(token.coinType)}
                      index={index}
                      compact
                    />
                  ))}
                </div>

                {/* Summary */}
                <div className="p-4 bg-sui-darker rounded-xl mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sui-muted">Selected Tokens</span>
                    <span className="font-semibold">{selectedTokens.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sui-muted">Total Value</span>
                    <span className="font-semibold text-sui-warning">
                      {formatUSD(totalSelectedValue)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 bg-sui-blue/10 border border-sui-blue/30 rounded-xl mb-4">
                  <p className="text-sm text-sui-muted">
                    <span className="text-sui-blue font-medium">Pool Mode:</span> Your dust will be pooled with the community. When the collection target is reached, admin will batch swap all tokens to SUI. You receive SUI proportional to your share.
                  </p>
                </div>

                {/* Deposit Button */}
                <button
                  onClick={onDeposit}
                  disabled={selectedTokens.length === 0 || !isVaultOpen || isDepositing}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2",
                    selectedTokens.length > 0 && isVaultOpen && !isDepositing
                      ? "bg-sui-gradient hover:opacity-90"
                      : "bg-sui-darker text-sui-muted cursor-not-allowed"
                  )}
                >
                  {isDepositing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Depositing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Deposit to Pool</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-sui-success mx-auto mb-4" />
                <p className="text-sui-muted">No dust tokens found!</p>
                <p className="text-sm text-sui-muted mt-1">Your wallet is clean.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
