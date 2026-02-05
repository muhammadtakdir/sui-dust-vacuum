"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Check, AlertCircle } from "lucide-react";
import { TokenBalance } from "@/types";
import { formatBalance, formatUSD, cn } from "@/lib/utils";
import { SUI_TYPE } from "@/lib/constants";

interface TokenCardProps {
  token: TokenBalance;
  onSelect?: () => void;
  isSelectable?: boolean;
  index: number;
  compact?: boolean;
}

export function TokenCard({ token, onSelect, isSelectable = true, index, compact = false }: TokenCardProps) {
  const isSui = token.coinType === SUI_TYPE;
  const canSelect = isSelectable && !isSui;

  return (
    <motion.div
      className={cn(
        "token-card relative bg-sui-card border rounded-xl cursor-pointer",
        compact ? "p-3" : "p-4",
        token.selected ? "border-sui-blue shadow-lg shadow-sui-blue/20" : "border-sui-border",
        token.isDust && !token.selected && "border-sui-warning/30",
        isSui && "border-sui-success/30 cursor-default",
        !canSelect && "cursor-default"
      )}
      onClick={() => canSelect && onSelect?.()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={canSelect ? { scale: 1.02 } : {}}
      whileTap={canSelect ? { scale: 0.98 } : {}}
    >
      {/* Selection checkbox */}
      {canSelect && (
        <motion.div
          className={cn(
            "absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center",
            token.selected
              ? "bg-sui-blue border-sui-blue"
              : "border-sui-border bg-sui-darker"
          )}
          animate={{
            scale: token.selected ? [1, 1.2, 1] : 1,
          }}
        >
          {token.selected && <Check className="w-4 h-4 text-white" />}
        </motion.div>
      )}

      {/* Dust badge */}
      {token.isDust && (
        <motion.div
          className="absolute top-3 left-3 px-2 py-0.5 bg-sui-warning/20 border border-sui-warning/30 rounded-full flex items-center gap-1"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <AlertCircle className="w-3 h-3 text-sui-warning" />
          <span className="text-xs text-sui-warning font-medium">Dust</span>
        </motion.div>
      )}

      {/* SUI badge */}
      {isSui && (
        <motion.div
          className="absolute top-3 left-3 px-2 py-0.5 bg-sui-success/20 border border-sui-success/30 rounded-full"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <span className="text-xs text-sui-success font-medium">Main</span>
        </motion.div>
      )}

      {/* Token info */}
      <div className={cn("flex items-center gap-3", compact ? "mt-4" : "mt-6")}>
        {/* Token logo */}
        <div className={cn(
          "relative rounded-full overflow-hidden bg-sui-darker flex items-center justify-center",
          compact ? "w-10 h-10" : "w-12 h-12"
        )}>
          {token.logo ? (
            <Image
              src={token.logo}
              alt={token.symbol}
              width={compact ? 40 : 48}
              height={compact ? 40 : 48}
              className="object-cover"
              onError={(e) => {
                // Fallback to symbol
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <span className={cn("font-bold text-sui-muted", compact ? "text-sm" : "text-lg")}>
              {token.symbol.slice(0, 2)}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={cn("font-semibold truncate", compact && "text-sm")}>{token.symbol}</h3>
          {!compact && <p className="text-sm text-sui-muted truncate">{token.name}</p>}
        </div>

        {/* Compact mode: Show value inline */}
        {compact && (
          <span
            className={cn(
              "text-sm font-medium",
              token.isDust ? "text-sui-warning" : "text-sui-success"
            )}
          >
            {formatUSD(token.valueUSD)}
          </span>
        )}
      </div>

      {/* Balance info - only in full mode */}
      {!compact && (
        <div className="mt-4 space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-sui-muted text-sm">Balance</span>
            <span className="font-mono font-medium">
              {formatBalance(token.balance.toString(), token.decimals)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sui-muted text-sm">Value</span>
            <span
              className={cn(
                "font-medium",
                token.isDust ? "text-sui-warning" : "text-sui-success"
              )}
            >
              {formatUSD(token.valueUSD)}
            </span>
          </div>
        </div>
      )}

      {/* Animated vacuum effect when selected */}
      {token.selected && (
        <motion.div
          className="absolute inset-0 border-2 border-sui-blue rounded-xl"
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
}

export function TokenCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      className="bg-sui-card border border-sui-border rounded-xl p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-sui-darker shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-20 bg-sui-darker rounded shimmer" />
          <div className="h-3 w-32 bg-sui-darker rounded shimmer" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full bg-sui-darker rounded shimmer" />
        <div className="h-4 w-2/3 bg-sui-darker rounded shimmer" />
      </div>
    </motion.div>
  );
}
