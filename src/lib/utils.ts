import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBalance(balance: string | bigint, decimals: number = 9): string {
  const balanceNum = typeof balance === 'string' ? BigInt(balance) : balance;
  const divisor = BigInt(10 ** decimals);
  const integerPart = balanceNum / divisor;
  const fractionalPart = balanceNum % divisor;
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '');
  
  if (trimmedFractional === '') {
    return integerPart.toString();
  }
  
  return `${integerPart}.${trimmedFractional}`;
}

export function formatUSD(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  }
  return `$${value.toFixed(2)}`;
}

export function shortenAddress(address: string, chars: number = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function isDustToken(valueUSD: number, threshold: number = 1): boolean {
  return valueUSD < threshold && valueUSD > 0;
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
