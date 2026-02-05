// Common token addresses on Sui Mainnet
export const TOKENS = {
  SUI: {
    type: "0x2::sui::SUI",
    symbol: "SUI",
    name: "Sui",
    decimals: 9,
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/20947.png",
  },
  USDC: {
    type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
  },
  USDT: {
    type: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/825.png",
  },
  WETH: {
    type: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 8,
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/2396.png",
  },
  CETUS: {
    type: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    symbol: "CETUS",
    name: "Cetus",
    decimals: 9,
    logo: "https://s2.coinmarketcap.com/static/img/coins/64x64/23991.png",
  },
  DEEP: {
    type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    symbol: "DEEP",
    name: "DeepBook",
    decimals: 6,
    logo: "https://images.deepbook.tech/icon.png",
  },
  SCA: {
    type: "0x7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
    symbol: "SCA",
    name: "Scallop",
    decimals: 9,
    logo: "https://app.scallop.io/images/logo-192x192.png",
  },
  BUCK: {
    type: "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    symbol: "BUCK",
    name: "Bucket USD",
    decimals: 9,
    logo: "https://bucket.fi/buck-logo.svg",
  },
  NAVX: {
    type: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    symbol: "NAVX",
    name: "NAVI Protocol",
    decimals: 9,
    logo: "https://app.naviprotocol.io/favicon.ico",
  },
  TURBOS: {
    type: "0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c355171f84bb1ba4a::turbos::TURBOS",
    symbol: "TURBOS",
    name: "Turbos Finance",
    decimals: 9,
    logo: "https://app.turbos.finance/images/token/TURBOS.png",
  },
} as const;

export type TokenInfo = {
  type: string;
  symbol: string;
  name: string;
  decimals: number;
  logo: string;
};

export const KNOWN_TOKENS: Record<string, TokenInfo> = TOKENS;

export function getTokenInfo(coinType: string): TokenInfo | null {
  // Check if it's a known token
  for (const token of Object.values(KNOWN_TOKENS)) {
    if (token.type === coinType) {
      return token;
    }
  }
  return null;
}

export function extractSymbolFromType(coinType: string): string {
  // Extract symbol from coin type like "0x...::module::SYMBOL"
  const parts = coinType.split("::");
  if (parts.length >= 3) {
    return parts[parts.length - 1];
  }
  return "UNKNOWN";
}
