"use client";

import { motion } from "framer-motion";
import { Wind, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type VacuumMode = "individual" | "pool";

interface PoolModeSelectorProps {
  mode: VacuumMode;
  onChange: (mode: VacuumMode) => void;
}

export function PoolModeSelector({ mode, onChange }: PoolModeSelectorProps) {
  return (
    <div className="flex gap-2 p-1 bg-sui-darker rounded-xl border border-sui-border">
      <button
        onClick={() => onChange("individual")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
          mode === "individual"
            ? "bg-sui-gradient text-white shadow-lg"
            : "text-sui-muted hover:text-white"
        )}
      >
        <Wind className="w-4 h-4" />
        <span>Individual</span>
      </button>
      <button
        onClick={() => onChange("pool")}
        className={cn(
          "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all",
          mode === "pool"
            ? "bg-sui-gradient text-white shadow-lg"
            : "text-sui-muted hover:text-white"
        )}
      >
        <Users className="w-4 h-4" />
        <span>DustDAO Pool</span>
      </button>
    </div>
  );
}

// Tooltip component for mode explanation
export function ModeTooltip({ mode }: { mode: VacuumMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-3 bg-sui-darker/80 rounded-xl border border-sui-border text-sm"
    >
      {mode === "individual" ? (
        <div className="space-y-2">
          <p className="text-sui-muted">
            <span className="text-white font-medium">Individual Mode:</span> Swap ALL your dust tokens directly to SUI in your wallet.
          </p>
          <ul className="text-sui-muted list-disc list-inside text-xs space-y-1">
            <li>You pay gas fees</li>
            <li>SUI goes directly to your wallet</li>
            <li>Best for larger dust amounts (&gt;$1)</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sui-muted">
            <span className="text-white font-medium">DustDAO Pool:</span> Pool your dust with other users for gas-efficient batch swaps.
          </p>
          <ul className="text-sui-muted list-disc list-inside text-xs space-y-1">
            <li>Admin pays gas, gets 2% fee</li>
            <li>Claim SUI or auto-stake for yield</li>
            <li>Best for tiny dust amounts (&lt;$1)</li>
            <li>Earn voting power in DustDAO</li>
          </ul>
        </div>
      )}
    </motion.div>
  );
}
