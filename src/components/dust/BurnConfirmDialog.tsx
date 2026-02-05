"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Flame } from "lucide-react";
import { TokenBalance } from "@/types";
import { formatBalance, formatUSD } from "@/lib/utils";

interface BurnConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokens: TokenBalance[];
  isLoading?: boolean;
}

export function BurnConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  tokens,
  isLoading = false,
}: BurnConfirmDialogProps) {
  const totalValue = tokens.reduce((sum, t) => sum + t.valueUSD, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-sui-card border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Burn Tokens?</h3>
                    <p className="text-sm text-sui-muted">This action is irreversible</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-sui-border rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Warning */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-red-400 text-sm">
                  ⚠️ <strong>Warning:</strong> Burning tokens will permanently destroy them.
                  They cannot be recovered. These tokens have no liquidity on Cetus and
                  cannot be swapped to SUI.
                </p>
              </div>

              {/* Token list */}
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {tokens.map((token) => (
                  <div
                    key={token.coinType}
                    className="flex items-center justify-between bg-sui-darker rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-red-400" />
                      <span className="font-medium">{token.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono">
                        {formatBalance(token.balance.toString(), token.decimals)}
                      </div>
                      <div className="text-xs text-sui-muted">
                        {formatUSD(token.valueUSD)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center bg-sui-darker rounded-lg p-3 mb-6">
                <span className="text-sui-muted">Total Value to Burn</span>
                <span className="font-bold text-red-400">{formatUSD(totalValue)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl bg-sui-border hover:bg-sui-darker transition-colors font-medium"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Burning...
                    </>
                  ) : (
                    <>
                      <Flame className="w-4 h-4" />
                      Burn {tokens.length} Token{tokens.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
