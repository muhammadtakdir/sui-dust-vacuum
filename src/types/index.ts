export interface TokenBalance {
  coinType: string;
  symbol: string;
  name: string;
  balance: bigint;
  decimals: number;
  logo: string | null;
  priceUSD: number;
  valueUSD: number;
  objectIds: string[];
  isDust: boolean;
  selected: boolean;
  verified?: boolean; // Token verified by Cetus (shows blue checkmark)
  hasRoute?: boolean; // Whether this token has a swap route on Cetus
  action?: 'swap' | 'burn' | 'donate'; // What to do with this token
}

export interface SwapRoute {
  fromToken: string;
  toToken: string;
  amountIn: string;
  amountOut: string;
  priceImpact: number;
  route: RouteStep[];
}

export interface RouteStep {
  poolId: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
}

export interface VacuumResult {
  success: boolean;
  txDigest?: string;
  tokensSwapped: number;
  tokensBurned?: number;
  tokensDonated?: number;
  totalSuiReceived: string;
  totalValueUSD: number;
  error?: string;
  failedTokens?: string[];
}

export interface DustSettings {
  thresholdUSD: number;
  slippage: number;
  autoSelectDust: boolean;
}

export type VacuumState = 
  | 'idle' 
  | 'loading' 
  | 'selecting' 
  | 'preparing' 
  | 'swapping' 
  | 'success' 
  | 'error';

export interface PriceData {
  [coinType: string]: {
    usd: number;
    usd_24h_change?: number;
  };
}

// Re-export DustDAO types
export * from './dustdao';
