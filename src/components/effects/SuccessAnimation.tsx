"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { VacuumResult } from "@/types";
import { formatBalance } from "@/lib/utils";
import { SUI_EXPLORER_TX_URL } from "@/lib/constants";

interface SuccessAnimationProps {
  result: VacuumResult | null;
  onClose: () => void;
  customMessage?: string;
}

export function SuccessAnimation({ result, onClose, customMessage }: SuccessAnimationProps) {
  if (!result) return null;

  const hasFailedTokens = result.failedTokens && result.failedTokens.length > 0;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative bg-sui-card border border-sui-border rounded-3xl p-8 max-w-md w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success/Error Icon */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {result.success ? (
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-sui-success/30 rounded-full blur-xl"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="relative w-20 h-20 bg-sui-success rounded-full flex items-center justify-center">
                  <Check className="w-10 h-10 text-white" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-sui-danger rounded-full flex items-center justify-center">
                <X className="w-10 h-10 text-white" />
              </div>
            )}
          </motion.div>

          {/* Title */}
          <motion.h2
            className="text-2xl font-bold text-center mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {result.success 
              ? (hasFailedTokens ? "Partial Success" : (customMessage ? "Success! 🎉" : "Vacuum Complete! 🎉")) 
              : "Operation Failed"}
          </motion.h2>

          {/* Details */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {result.success ? (
              <>
                <p className="text-sui-muted text-center">
                  {customMessage 
                    ? customMessage 
                    : (hasFailedTokens 
                      ? "Some tokens were swapped successfully!" 
                      : "Successfully cleaned your wallet!")}
                </p>

                {/* Only show stats if we have actual swap data */}
                {result.tokensSwapped > 0 && (
                  <div className="bg-sui-darker rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sui-muted">Tokens Swapped</span>
                      <span className="font-semibold">{result.tokensSwapped}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sui-muted">SUI Received</span>
                      <span className="font-semibold text-sui-success">
                        +{formatBalance(result.totalSuiReceived)} SUI
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sui-muted">Value Converted</span>
                      <span className="font-semibold">
                        ~${result.totalValueUSD.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Failed tokens warning */}
                {hasFailedTokens && (
                  <div className="bg-sui-warning/10 border border-sui-warning/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-sui-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sui-warning text-sm font-medium">
                          Could not swap {result.failedTokens!.length} token(s)
                        </p>
                        <p className="text-sui-muted text-xs mt-1">
                          {result.failedTokens!.join(", ")}
                        </p>
                        <p className="text-sui-muted text-xs mt-2">
                          No liquidity pool available on Cetus for these tokens
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {result.txDigest && (
                  <a
                    href={`${SUI_EXPLORER_TX_URL}/${result.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sui-blue hover:text-sui-blue/80 transition-colors"
                  >
                    View Transaction
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-sui-danger/10 border border-sui-danger/30 rounded-xl p-4">
                  <p className="text-sui-danger text-sm">
                    {result.error || "An unknown error occurred"}
                  </p>
                </div>

                {/* Show failed tokens if any */}
                {hasFailedTokens && (
                  <div className="bg-sui-darker rounded-xl p-4">
                    <p className="text-sui-muted text-sm mb-2">Tokens without liquidity pools:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.failedTokens!.map((token) => (
                        <span 
                          key={token}
                          className="px-2 py-1 bg-sui-card border border-sui-border rounded-lg text-xs"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                    <p className="text-sui-muted text-xs mt-3">
                      💡 Tip: These tokens cannot be swapped to SUI directly. 
                      Try swapping them manually to USDC or another token first on Cetus DEX.
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Close Button */}
          <motion.button
            className="w-full mt-6 btn-primary"
            onClick={onClose}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {result.success ? (hasFailedTokens ? "Got it!" : "Awesome!") : "Try Again"}
          </motion.button>

          {/* Confetti for success */}
          {result.success && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ["#4DA2FF", "#6366F1", "#22C55E", "#F59E0B"][
                      i % 4
                    ],
                    left: `${Math.random() * 100}%`,
                    top: "-10%",
                  }}
                  animate={{
                    y: ["0vh", "110vh"],
                    x: [0, (Math.random() - 0.5) * 100],
                    rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    ease: "easeIn",
                    delay: Math.random() * 0.5,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function LoadingSpinner({ size = 24 }: { size?: number }) {
  return (
    <Loader2 className="animate-spin" style={{ width: size, height: size }} />
  );
}
