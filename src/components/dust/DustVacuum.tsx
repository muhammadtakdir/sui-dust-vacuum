"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCurrentAccount, ConnectButton } from "@mysten/dapp-kit";
import { useState, useCallback } from "react";
import {
  Wind,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  XCircle,
  Info,
  Flame,
  Gift,
} from "lucide-react";
import { useTokenBalances, useDustVacuum } from "@/hooks";
import { TokenCard, TokenCardSkeleton } from "./TokenCard";
import { VacuumButton } from "./VacuumButton";
import { PoolModeSelector, ModeTooltip, VacuumMode } from "./PoolModeSelector";
import { DustDAOPool } from "./DustDAOPool";
import { BurnConfirmDialog } from "./BurnConfirmDialog";
import { SuccessAnimation } from "@/components/effects/SuccessAnimation";
import { VacuumEffect } from "@/components/effects/VacuumEffect";
import { formatUSD, cn } from "@/lib/utils";
import { DEFAULT_DUST_THRESHOLD_USD } from "@/lib/constants";
import { TokenBalance } from "@/types";

export function DustVacuum() {
  const account = useCurrentAccount();
  const [dustThreshold, setDustThreshold] = useState(DEFAULT_DUST_THRESHOLD_USD);
  const [showSettings, setShowSettings] = useState(false);
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [vacuumMode, setVacuumMode] = useState<VacuumMode>("individual");
  const [expandedSections, setExpandedSections] = useState({
    dust: true,
    other: false,
  });
  const [showBurnConfirm, setShowBurnConfirm] = useState(false);
  const [tokenActions, setTokenActions] = useState<Record<string, 'swap' | 'burn' | 'donate'>>({});

  const {
    balances,
    isLoading,
    fetchBalances,
    toggleSelection,
    selectAllDust,
    deselectAll,
    selectedTokens,
    dustTokens,
    totalDustValue,
    selectedValue,
    updateTokenAction,
  } = useTokenBalances(dustThreshold);

  const { state, progress, currentStep, result, routeResults, vacuum, burnTokens, donateTokens, reset } = useDustVacuum();

  const nonDustTokens = balances.filter((t) => !t.isDust && t.coinType !== "0x2::sui::SUI");
  const suiToken = balances.find((t) => t.coinType === "0x2::sui::SUI");

  // Check how many selected tokens have no routes
  const tokensWithoutRoutes = routeResults.filter(r => !r.hasRoute);
  const tokensWithRoutes = routeResults.filter(r => r.hasRoute);

  // Get tokens to burn (selected tokens that have no route and action is 'burn')
  const tokensToBurn = selectedTokens.filter(t => {
    const routeCheck = routeResults.find(r => r.coinType === t.coinType);
    return routeCheck && !routeCheck.hasRoute && (tokenActions[t.coinType] === 'burn' || t.action === 'burn');
  });

  // Get tokens to donate (selected tokens that have no route and action is 'donate')  
  const tokensToDonate = selectedTokens.filter(t => {
    const routeCheck = routeResults.find(r => r.coinType === t.coinType);
    return routeCheck && !routeCheck.hasRoute && (tokenActions[t.coinType] === 'donate' || t.action === 'donate');
  });

  // Handle action change for a token
  const handleActionChange = useCallback((coinType: string, action: 'swap' | 'burn' | 'donate') => {
    setTokenActions(prev => ({ ...prev, [coinType]: action }));
    updateTokenAction?.(coinType, action);
  }, [updateTokenAction]);

  const handleVacuum = async () => {
    if (selectedTokens.length === 0) return;
    
    // If there are tokens to burn, show confirmation dialog first
    if (tokensToBurn.length > 0) {
      setShowBurnConfirm(true);
      return;
    }
    
    // Otherwise proceed with normal vacuum
    await vacuum(selectedTokens);
  };

  const handleBurnConfirm = async () => {
    setShowBurnConfirm(false);
    
    // First burn the tokens without routes
    if (tokensToBurn.length > 0) {
      await burnTokens(tokensToBurn);
    }
    
    // Then swap the tokens with routes
    const tokensToSwap = selectedTokens.filter(t => {
      const routeCheck = routeResults.find(r => r.coinType === t.coinType);
      return !routeCheck || routeCheck.hasRoute;
    });
    
    if (tokensToSwap.length > 0) {
      await vacuum(tokensToSwap);
    }
  };

  const handleDonate = async () => {
    if (tokensToDonate.length > 0) {
      await donateTokens(tokensToDonate);
    }
  };

  const handleClose = () => {
    reset();
    fetchBalances();
  };

  // If not connected, show connect prompt
  if (!account) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="card text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className="w-20 h-20 bg-sui-gradient rounded-3xl flex items-center justify-center mx-auto mb-6"
              animate={{
                rotate: [0, 10, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Wind className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
            <p className="text-sui-muted mb-8 max-w-md mx-auto">
              Connect your Sui wallet to scan for dust tokens and start vacuuming!
            </p>
            <ConnectButton
              connectText="Connect Wallet"
              className="!bg-sui-gradient !border-none !rounded-xl !px-8 !py-3 !font-semibold hover:!opacity-90 transition-opacity"
            />
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Mode Selector */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 max-w-md">
              <PoolModeSelector mode={vacuumMode} onChange={setVacuumMode} />
            </div>
            <button
              onClick={() => setShowModeInfo(!showModeInfo)}
              className={cn(
                "p-2 rounded-xl border transition-colors",
                showModeInfo
                  ? "bg-sui-blue border-sui-blue"
                  : "border-sui-border hover:border-sui-blue"
              )}
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <AnimatePresence>
            {showModeInfo && <ModeTooltip mode={vacuumMode} />}
          </AnimatePresence>
        </motion.div>

        {/* Conditional Content based on Mode */}
        {vacuumMode === "pool" ? (
          <DustDAOPool dustThreshold={dustThreshold} />
        ) : (
          <>
            {/* Individual Mode Header */}
            <motion.div
              className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div>
                <h2 className="text-2xl font-bold mb-1">Your Wallet</h2>
                <p className="text-sui-muted">
                  Found <span className="text-sui-warning">{dustTokens.length} dust tokens</span> worth{" "}
              <span className="text-sui-warning">{formatUSD(totalDustValue)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Settings button */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-xl border transition-colors",
                showSettings
                  ? "bg-sui-blue border-sui-blue"
                  : "border-sui-border hover:border-sui-blue"
              )}
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Refresh button */}
            <button
              onClick={fetchBalances}
              disabled={isLoading}
              className="p-2 rounded-xl border border-sui-border hover:border-sui-blue transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
            </button>
          </div>
        </motion.div>

        {/* Settings panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              className="card mb-6"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <h3 className="font-semibold mb-4">Vacuum Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-sui-muted mb-2 block">
                    Dust Threshold: <span className="text-white">${dustThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={dustThreshold}
                    onChange={(e) => setDustThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-sui-darker rounded-lg appearance-none cursor-pointer accent-sui-blue"
                  />
                  <p className="text-xs text-sui-muted mt-1">
                    Tokens valued below this threshold will be marked as dust
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Token list */}
          <div className="lg:col-span-2 space-y-6">
            {/* SUI Balance */}
            {suiToken && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-sui-success rounded-full" />
                  Your SUI
                </h3>
                <TokenCard token={suiToken} isSelectable={false} index={0} />
              </motion.div>
            )}

            {/* Dust tokens */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                className="w-full flex items-center justify-between mb-3"
                onClick={() =>
                  setExpandedSections((prev) => ({ ...prev, dust: !prev.dust }))
                }
              >
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-sui-warning" />
                  Dust Tokens ({dustTokens.length})
                </h3>
                {expandedSections.dust ? (
                  <ChevronUp className="w-5 h-5 text-sui-muted" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-sui-muted" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.dust && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {isLoading ? (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                          <TokenCardSkeleton key={i} index={i} />
                        ))}
                      </div>
                    ) : dustTokens.length > 0 ? (
                      <>
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={selectAllDust}
                            className="text-sm text-sui-blue hover:underline"
                          >
                            Select All Dust
                          </button>
                          <span className="text-sui-muted">|</span>
                          <button
                            onClick={deselectAll}
                            className="text-sm text-sui-muted hover:text-white"
                          >
                            Deselect All
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {dustTokens.map((token, index) => {
                            // Check if this token has a route
                            const routeCheck = routeResults.find(r => r.coinType === token.coinType);
                            const hasNoRoute = routeCheck && !routeCheck.hasRoute;
                            const tokenWithRoute = {
                              ...token,
                              hasRoute: !hasNoRoute,
                              action: tokenActions[token.coinType] || token.action,
                            };
                            
                            return (
                              <TokenCard
                                key={token.coinType}
                                token={tokenWithRoute}
                                onSelect={() => toggleSelection(token.coinType)}
                                index={index}
                                showActionBadge={hasNoRoute && token.selected}
                                onActionChange={(action) => handleActionChange(token.coinType, action)}
                              />
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="card text-center py-8">
                        <CheckCircle2 className="w-12 h-12 text-sui-success mx-auto mb-4" />
                        <p className="text-sui-muted">No dust tokens found! Your wallet is clean.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Other tokens */}
            {nonDustTokens.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  className="w-full flex items-center justify-between mb-3"
                  onClick={() =>
                    setExpandedSections((prev) => ({ ...prev, other: !prev.other }))
                  }
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 bg-sui-blue rounded-full" />
                    Other Tokens ({nonDustTokens.length})
                  </h3>
                  {expandedSections.other ? (
                    <ChevronUp className="w-5 h-5 text-sui-muted" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-sui-muted" />
                  )}
                </button>

                <AnimatePresence>
                  {expandedSections.other && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        {nonDustTokens.map((token, index) => {
                          const routeCheck = routeResults.find(r => r.coinType === token.coinType);
                          const hasNoRoute = routeCheck && !routeCheck.hasRoute;
                          const tokenWithRoute = {
                            ...token,
                            hasRoute: !hasNoRoute,
                            action: tokenActions[token.coinType] || token.action,
                          };
                          
                          return (
                            <TokenCard
                              key={token.coinType}
                              token={tokenWithRoute}
                              onSelect={() => toggleSelection(token.coinType)}
                              index={index}
                              showActionBadge={hasNoRoute && token.selected}
                              onActionChange={(action) => handleActionChange(token.coinType, action)}
                            />
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Vacuum panel */}
          <div className="lg:col-span-1">
            <motion.div
              className="card sticky top-24"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wind className="w-5 h-5 text-sui-blue" />
                Vacuum Summary
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-sui-muted">Selected Tokens</span>
                  <span className="font-semibold">{selectedTokens.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sui-muted">Total Value</span>
                  <span className="font-semibold text-sui-warning">
                    {formatUSD(selectedValue)}
                  </span>
                </div>
                <div className="h-px bg-sui-border" />
                <div className="flex justify-between">
                  <span className="text-sui-muted">You Receive</span>
                  <span className="font-semibold text-sui-success">~SUI</span>
                </div>
              </div>

              {/* Route Status - Show after checking */}
              {routeResults.length > 0 && (
                <motion.div
                  className="mb-6 space-y-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Tokens with routes */}
                  {tokensWithRoutes.length > 0 && (
                    <div className="p-3 bg-sui-success/10 border border-sui-success/30 rounded-xl">
                      <div className="flex items-center gap-2 text-sui-success text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{tokensWithRoutes.length} token(s) can be swapped</span>
                      </div>
                    </div>
                  )}

                  {/* Tokens without routes */}
                  {tokensWithoutRoutes.length > 0 && (
                    <div className="p-3 bg-sui-danger/10 border border-sui-danger/30 rounded-xl">
                      <div className="flex items-start gap-2 text-sui-danger text-sm">
                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">No liquidity pool found:</p>
                          <p className="text-sui-muted mt-1">
                            {tokensWithoutRoutes.map(t => t.symbol).join(", ")}
                          </p>
                          <p className="text-xs text-sui-muted mt-2">
                            These tokens cannot be swapped to SUI via Cetus Aggregator
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Warning for selected tokens that may not have routes */}
              {selectedTokens.length > 0 && routeResults.length === 0 && state === "idle" && (
                <motion.div
                  className="mb-6 p-3 bg-sui-warning/10 border border-sui-warning/30 rounded-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start gap-2 text-sui-warning text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>Routes will be checked when you click Vacuum</p>
                      <p className="text-xs text-sui-muted mt-1">
                        Some tokens may not have liquidity pools with SUI
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Progress indicator */}
              {state !== "idle" && state !== "success" && state !== "error" && (
                <motion.div
                  className="mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-sui-muted">{currentStep}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-sui-darker rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-sui-gradient"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Show warning if some tokens have no routes */}
              {tokensToBurn.length > 0 && (
                <motion.div
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-400 font-medium mb-1">
                        {tokensToBurn.length} token{tokensToBurn.length > 1 ? 's' : ''} will be burned
                      </p>
                      <p className="text-xs text-red-400/70">
                        These tokens have no liquidity pool and cannot be swapped. They will be permanently destroyed.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {tokensToDonate.length > 0 && (
                <motion.div
                  className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-start gap-3">
                    <Gift className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-purple-400 font-medium mb-1">
                        {tokensToDonate.length} token{tokensToDonate.length > 1 ? 's' : ''} will be donated
                      </p>
                      <p className="text-xs text-purple-400/70">
                        These tokens will be sent to the DustDAO community pool.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <VacuumButton
                onClick={handleVacuum}
                isLoading={state === "preparing" || state === "swapping" || state === "loading"}
                disabled={selectedTokens.length === 0}
                selectedCount={selectedTokens.length}
              />

              <p className="text-xs text-sui-muted text-center mt-4">
                Powered by Cetus Aggregator
              </p>
            </motion.div>
          </div>
        </div>

        {/* Vacuum visual effect */}
        <VacuumEffect isActive={state === "swapping"} />

        {/* Burn confirmation dialog */}
        <BurnConfirmDialog
          isOpen={showBurnConfirm}
          onClose={() => setShowBurnConfirm(false)}
          onConfirm={handleBurnConfirm}
          tokens={tokensToBurn}
          isLoading={state === "preparing" || state === "swapping"}
        />

        {/* Success/Error modal */}
        {(state === "success" || state === "error") && (
          <SuccessAnimation result={result} onClose={handleClose} />
        )}
          </>
        )}
      </div>
    </section>
  );
}
