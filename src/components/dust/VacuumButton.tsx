"use client";

import { motion } from "framer-motion";
import { Wind, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VacuumButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
  selectedCount: number;
}

export function VacuumButton({
  onClick,
  isLoading,
  disabled,
  selectedCount,
}: VacuumButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "relative w-full py-4 rounded-2xl font-bold text-lg overflow-hidden",
        "bg-sui-gradient text-white",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all duration-300"
      )}
      whileHover={!disabled && !isLoading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
    >
      {/* Animated background */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={
          !disabled && !isLoading
            ? {
                x: ["-100%", "100%"],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Button content */}
      <span className="relative flex items-center justify-center gap-3">
        {isLoading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Vacuuming...</span>
          </>
        ) : (
          <>
            <motion.div
              animate={
                !disabled
                  ? {
                      rotate: [0, 15, -15, 0],
                    }
                  : {}
              }
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Wind className="w-6 h-6" />
            </motion.div>
            <span>
              {selectedCount > 0
                ? `Vacuum ${selectedCount} Token${selectedCount > 1 ? "s" : ""}`
                : "Select Tokens to Vacuum"}
            </span>
          </>
        )}
      </span>

      {/* Particle effect on hover */}
      {!disabled && !isLoading && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${15 + i * 15}%`,
                top: "50%",
              }}
              animate={{
                y: [0, -10, 0],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={
          !disabled && !isLoading
            ? {
                boxShadow: [
                  "0 0 20px rgba(77, 162, 255, 0.3)",
                  "0 0 40px rgba(77, 162, 255, 0.5)",
                  "0 0 20px rgba(77, 162, 255, 0.3)",
                ],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.button>
  );
}
