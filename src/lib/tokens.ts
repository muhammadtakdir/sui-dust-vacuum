// Common token addresses on Sui Mainnet
export const TOKENS = {
  SUI: {
    type: "0x2::sui::SUI",
    symbol: "SUI",
    name: "Sui",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/26375/standard/sui_asset.jpeg",
  },
  USDC: {
    type: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logo: "https://assets.coingecko.com/coins/images/6319/standard/usdc.png",
  },
  USDT: {
    type: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logo: "https://assets.coingecko.com/coins/images/325/standard/Tether.png",
  },
  WETH: {
    type: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 8,
    logo: "https://assets.coingecko.com/coins/images/2518/standard/weth.png",
  },
  CETUS: {
    type: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
    symbol: "CETUS",
    name: "Cetus",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/30256/standard/cetus.png",
  },
  DEEP: {
    type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
    symbol: "DEEP",
    name: "DeepBook",
    decimals: 6,
    logo: "https://assets.coingecko.com/coins/images/39689/standard/deep.png",
  },
  SCA: {
    type: "0x7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
    symbol: "SCA",
    name: "Scallop",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/33495/standard/scallop.jpeg",
  },
  BUCK: {
    type: "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
    symbol: "BUCK",
    name: "Bucket USD",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/33558/standard/bucket_protocol.jpeg",
  },
  NAVX: {
    type: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
    symbol: "NAVX",
    name: "NAVI Protocol",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/33786/standard/navx.png",
  },
  TURBOS: {
    type: "0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c355171f84bb1ba4a::turbos::TURBOS",
    symbol: "TURBOS",
    name: "Turbos Finance",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/32519/standard/turbos.jpeg",
  },
  BLUB: {
    type: "0xfa7ac3951fdca92c5200d468d31a365eb03b2be9936fde615e69f0c1274ad3a0::BLUB::BLUB",
    symbol: "BLUB",
    name: "BLUB",
    decimals: 2,
    logo: "https://assets.coingecko.com/coins/images/36006/standard/blub.jpeg",
  },
  AXOL: {
    type: "0x0a7a5b65f8203cfe67f4541d915f85fe05c3af6e166516c3a90a8d8aabc6c04a::axol::AXOL",
    symbol: "AXOL",
    name: "AXOLcoin",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/38295/standard/axol.jpeg",
  },
  FUD: {
    type: "0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD",
    symbol: "FUD",
    name: "FUD",
    decimals: 5,
    logo: "https://assets.coingecko.com/coins/images/35822/standard/fud.jpeg",
  },
  HIPPO: {
    type: "0x8993129d72e733985f7f1a00396cbd055bad6f817fee36576ce483c8bbb8b87b::sudeng::SUDENG",
    symbol: "HIPPO",
    name: "Sudeng",
    decimals: 9,
    logo: "https://assets.coingecko.com/coins/images/38538/standard/hippo.jpeg",
  },
  SPAM: {
    type: "0x30a644c3485ee9b604f52165668895092191fcaf5489a846afa7fc11cdb9b24a::spam::SPAM",
    symbol: "SPAM",
    name: "SPAM",
    decimals: 9,
    logo: "",
  },
  CERT: {
    type: "0x9a2c689fae76891a4f5aa6c395c1da7b8a7ed0de8e3f4c8b8f1d5ba9e7a5d18c::cert::CERT",
    symbol: "CERT",
    name: "CERT",
    decimals: 9,
    logo: "",
  },
  GSUI: {
    type: "0x7f6ce7ade63857c4fd16ef7783fed2dfc4d7fb7e40615abdb653030b76aef0c6::gsui::GSUI",
    symbol: "GSUI",
    name: "Governance SUI",
    decimals: 9,
    logo: "",
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
