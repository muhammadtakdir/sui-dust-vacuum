"use client";

import { motion } from "framer-motion";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Sparkles, Wind, ArrowDown, Zap } from "lucide-react";

export function HeroSection() {
  const account = useCurrentAccount();

  return (
    <section className="relative pt-32 pb-16 px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated Icon */}
        <motion.div
          className="relative inline-block mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        >
          <motion.div
            className="w-24 h-24 bg-sui-gradient rounded-3xl flex items-center justify-center mx-auto relative"
            animate={{
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Wind className="w-12 h-12 text-white" />
            
            {/* Floating dust particles around icon */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                }}
                animate={{
                  x: [0, Math.cos((i * Math.PI * 2) / 6) * 50],
                  y: [0, Math.sin((i * Math.PI * 2) / 6) * 50],
                  opacity: [1, 0],
                  scale: [1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>
          
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 bg-sui-gradient rounded-3xl blur-2xl opacity-30"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="gradient-text">Sui Dust</span>
          <br />
          <span className="text-white">Vacuum</span>
        </motion.h1>

        {/* Problem Statement */}
        <motion.div
          className="max-w-3xl mx-auto mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-lg md:text-xl text-sui-muted">
            The <span className="text-yellow-400">&quot;Max&quot;</span> button lies. 
            Decimal math and gas buffers leave <span className="text-sui-blue font-semibold">frustrating dust</span> in your wallet.
          </p>
          <p className="text-base text-sui-muted/80 mt-2">
            $0.03 here, $0.10 there — swapping them costs more in gas than they&apos;re worth.
          </p>
        </motion.div>

        {/* Solution */}
        <motion.div
          className="bg-gradient-to-r from-sui-blue/10 to-sui-accent/10 border border-sui-blue/30 rounded-2xl p-4 max-w-2xl mx-auto mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-white font-medium">
            ✨ <span className="text-sui-blue">Sui Dust Vacuum</span> batches ALL your dust into <span className="text-green-400">ONE transaction</span>
          </p>
          <p className="text-sm text-sui-muted mt-1">
            Token balance → <span className="font-mono text-green-400">0</span> | All converted to SUI
          </p>
        </motion.div>

        {/* Stats or Features Pills */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <FeaturePill icon={<Zap className="w-4 h-4" />} text="One-Click Swap" />
          <FeaturePill icon={<Sparkles className="w-4 h-4" />} text="Powered by Cetus" />
          <FeaturePill icon={<Wind className="w-4 h-4" />} text="PTB Optimized" />
        </motion.div>

        {/* Scroll indicator */}
        {account && (
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <span className="text-sm text-sui-muted">Scroll down to vacuum</span>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowDown className="w-5 h-5 text-sui-blue" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <motion.div
      className="flex items-center gap-2 px-4 py-2 bg-sui-card border border-sui-border rounded-full"
      whileHover={{ scale: 1.05, borderColor: "rgba(77, 162, 255, 0.5)" }}
    >
      <span className="text-sui-blue">{icon}</span>
      <span className="text-sm font-medium">{text}</span>
    </motion.div>
  );
}
