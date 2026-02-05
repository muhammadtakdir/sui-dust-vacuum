// DustDAO Pool Mode Types

export interface VaultInfo {
  admin: string;
  totalShares: bigint;
  suiRewards: bigint;
  stakedSui: bigint;
  round: number;
  isOpen: boolean;
  depositorsCount: number;
  totalLifetimeShares: bigint;
  totalFeesCollected: bigint;
}

export interface UserShares {
  shares: bigint;
  sharesUSD: number;
  percentage: number;
}

export interface MembershipInfo {
  objectId: string;
  member: string;
  lifetimeShares: bigint;
  totalSuiEarned: bigint;
  stakedAmount: bigint;
  rewardPreference: number; // 0 = Claim, 1 = Auto-Stake
  joinedAtMs: number;
}

export interface DepositReceiptInfo {
  objectId: string;
  depositor: string;
  shares: bigint;
  round: number;
  rewardPreference: number;
}

export interface ProposalInfo {
  objectId: string;
  proposalId: number;
  title: string;
  creator: string;
  votesFor: bigint;
  votesAgainst: bigint;
  startTimeMs: number;
  endTimeMs: number;
  isActive: boolean;
  hasVoted?: boolean;
}

export interface TokenVaultInfo {
  objectId: string;
  coinType: string;
  balance: bigint;
  round: number;
}

export type PoolModeState = 
  | 'idle'
  | 'loading'
  | 'depositing'
  | 'claiming'
  | 'staking'
  | 'voting'
  | 'admin-action'
  | 'success'
  | 'error';

export interface PoolModeResult {
  success: boolean;
  txDigest?: string;
  action: 'deposit' | 'claim' | 'stake' | 'vote' | 'admin';
  message?: string;
  error?: string;
}

// Admin constants
// Note: This is a public address for UI display purposes only.
// Actual admin access is controlled by the AdminCap object ownership on-chain.
// Anyone can see this address, but only the AdminCap holder can execute admin functions.
export const ADMIN_WALLET = "0xe087a0ab3b923216b1792aa6343efa5b6bdd90c7c684741e047c3b9b5629e077";

// Security: Maximum USD value per deposit to prevent manipulation
// Frontend should validate: if claimed USD > MAX, reject or cap it
export const MAX_DUST_VALUE_USD = 100; // Max $100 per deposit (dust should be small)
export const MIN_DUST_VALUE_USD = 0.001; // Min $0.001 per deposit
