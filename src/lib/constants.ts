// Sui Network Constants
export const SUI_DECIMALS = 9;
export const SUI_TYPE = "0x2::sui::SUI";

// Clock object (shared object on Sui)
export const CLOCK_OBJECT_ID = "0x6";

// Dust Vacuum / DustDAO Smart Contract
export const DUST_VACUUM_CONTRACT = {
  testnet: {
    PACKAGE_ID: "0xe1d8d22cd372c58cd36f2eff09010ea102d07cc7d9dbe4f46997f04150ed0409",
    DUST_VAULT_ID: "",
    ADMIN_CAP_ID: "",
  },
  mainnet: {
    // v2: Security Update - Feb 5, 2026
    // TX: FvZF4YnoQ6TxnpkxJfZUxdyWkwpkoF3f71x4s4rWR2g3
    // Previous v1: 0x55422768ae1283fe6373602f11b4f21aa55ab57e2835182831e550c397e6fb60
    PACKAGE_ID: "0xcbcb622f6a47404be4c28d75dc47fdc0abfd2e8a730eb104495a404e5b2c56e4",
    DUST_VAULT_ID: "0xf0c002e13c121a72b12d39d3e6d1a99c10792ee5c3d539bb1c6b28c778beb720",
    ADMIN_CAP_ID: "0x5e270e3af10a6085119ea5f5b2e479dfcbd4a451abba02f3aa1463b81394a8a3",
  },
};

// Admin fee (2% = 200 basis points)
export const ADMIN_FEE_BPS = 200;

// Well-known Token Types (Mainnet)
export const KNOWN_TOKENS = {
  SUI: "0x2::sui::SUI",
  CETUS: "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  USDC: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
  USDT: "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN",
  WETH: "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
  BUCK: "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
  NAVX: "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  SCA: "0x7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
  DEEP: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
};

// Cetus Protocol Constants
export const CETUS_CONFIG = {
  // Mainnet addresses (from Cetus SDK: https://github.com/CetusProtocol/cetus-clmm-sui-sdk)
  mainnet: {
    // CLMM Pool global_config_id from SDK config
    GLOBAL_CONFIG_ID: "0x0408fa4e4a4c03cc0de8f23d0c2bbfe8913d178713c9a271ed4080973fe42d8f",
    POOLS_ID: "0x15b6a27dd9ae03eb455aba03b39e29aad74abd3757b8e18c0755651b2ae5b71e",
    PARTNER_CAP_ID: "0x3a5aa90ffa33d09100d7b6941ea1c0ffe6ab66e77062ddd26320c1b073aabb10",
    // CLMM Pool Package (for pool operations)
    CLMM_PACKAGE: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",
    CLMM_PUBLISHED_AT: "0xc6faf3703b0e8ba9ed06b7851134bbbe7565eb35ff823fd78432baa4cbeaa12e",
    // Integrate Package (for swap operations - pool_script_v2 module)
    INTEGRATE_PACKAGE: "0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3",
    INTEGRATE_PUBLISHED_AT: "0x2d8c2e0fc6dd25b0214b3fa747e0fd27fd54608142cd2e4f64c1cd350cc4add4",
    // Swap module name (pool_script_v2 for newer version)
    SWAP_MODULE: "pool_script_v2",
    AGGREGATOR_URL: "https://api-sui.cetus.zone/router_v2/find_routes",
    ALT_AGGREGATOR_URL: "https://api-sui.cetus.zone/router/find_routes",
    SWAP_URL: "https://api-sui.cetus.zone/v2/sui/swap",
  },
  testnet: {
    GLOBAL_CONFIG_ID: "0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a",
    POOLS_ID: "0x50eb61dd5928cec5ea04711a2e9b72e5237e79e9fbcd2ce3d5469dc8708e0ee2",
    PARTNER_CAP_ID: "",
    CLMM_PACKAGE: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",
    AGGREGATOR_URL: "https://api-sui.cetus.zone/router_v2/find_routes",
  },
};

// Dust threshold in USD
export const DEFAULT_DUST_THRESHOLD_USD = 1.0;
export const MAX_DUST_THRESHOLD_USD = 10.0;
export const MIN_DUST_THRESHOLD_USD = 0.1;

// Transaction settings
export const MAX_COINS_PER_TX = 20; // Maximum number of coins to swap in a single PTB
export const SLIPPAGE_TOLERANCE = 0.5; // 0.5% default slippage

// Gas budget
export const DEFAULT_GAS_BUDGET = 100000000; // 0.1 SUI

// Price feed endpoint (CoinGecko alternative for Sui tokens)
export const PRICE_API_URL = "https://api.dexscreener.com/latest/dex/tokens";

// Sui Explorer
export const SUI_EXPLORER_URL = "https://suiscan.xyz/mainnet";
export const SUI_EXPLORER_TX_URL = `${SUI_EXPLORER_URL}/tx`;
