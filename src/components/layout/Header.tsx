"use client";

import { motion } from "framer-motion";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function Header() {
  const account = useCurrentAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-40 glass"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <div className="w-10 h-10 bg-sui-gradient rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <motion.div
                className="absolute inset-0 bg-sui-gradient rounded-xl blur-lg opacity-50"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </motion.div>
            <div>
              <h1 className="font-bold text-lg gradient-text">Dust Vacuum</h1>
              <p className="text-xs text-sui-muted">Powered by Sui</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how-it-works">How it Works</NavLink>
            <NavLink href="https://github.com/yourusername/sui-dust-vacuum" external>
              GitHub
            </NavLink>
          </nav>

          {/* Wallet Connect */}
          <div className="hidden md:flex items-center gap-4">
            {account && (
              <div className="text-sm text-sui-muted">
                <span className="hidden lg:inline">Connected: </span>
                <span className="text-sui-blue font-mono">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
              </div>
            )}
            <ConnectButton
              connectText="Connect Wallet"
              className="!bg-sui-gradient !border-none !rounded-xl !px-4 !py-2 !font-semibold hover:!opacity-90 transition-opacity"
            />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          className="md:hidden bg-sui-card border-t border-sui-border"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="px-4 py-4 space-y-4">
            <NavLink href="#features" mobile onClick={() => setMobileMenuOpen(false)}>
              Features
            </NavLink>
            <NavLink href="#how-it-works" mobile onClick={() => setMobileMenuOpen(false)}>
              How it Works
            </NavLink>
            <NavLink href="https://github.com/yourusername/sui-dust-vacuum" external mobile>
              GitHub
            </NavLink>
            <div className="pt-4 border-t border-sui-border">
              <ConnectButton
                connectText="Connect Wallet"
                className="!bg-sui-gradient !border-none !rounded-xl !px-4 !py-2 !font-semibold !w-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  mobile?: boolean;
  onClick?: () => void;
}

function NavLink({ href, children, external, mobile, onClick }: NavLinkProps) {
  const baseClasses = mobile
    ? "block text-sui-muted hover:text-white transition-colors"
    : "text-sui-muted hover:text-white transition-colors text-sm";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} className={baseClasses} onClick={onClick}>
      {children}
    </a>
  );
}
