import { NextResponse } from "next/server";

interface TokenPrice {
  coinType: string;
  price: number;
  symbol?: string;
  decimals?: number;
  logo?: string;
  usdValue?: number;
  verified?: boolean;
}

// Known verified tokens on Sui (official, audited, major tokens)
// These are tokens listed on major DEXes and have been verified
const KNOWN_VERIFIED_TOKENS: Set<string> = new Set([
  "0x2::sui::SUI",
  // USDC
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN", // wUSDC
  // USDT
  "0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN", // wUSDT
  // WETH
  "0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN",
  // CETUS
  "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS",
  // SCA (Scallop)
  "0x7016aae72cfc67f2fadf55769c0a7dd54291a583b63051a5ed71081cce836ac6::sca::SCA",
  // DEEP
  "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  // BUCK
  "0xce7ff77a83ea0cb6fd39bd8748e2ec89a3f41e8efdc3f4eb123e0ca37b184db2::buck::BUCK",
  // TURBOS
  "0x5d1f47ea69bb0de31c313d7acf89b890dbb8991ea8e03c6c355171f84bb1ba4a::turbos::TURBOS",
  // NAVI
  "0xa99b8952d4f7d947ea77fe0ecdcc9e5fc0bcab2841d6e2a5aa00c3044e5544b5::navx::NAVX",
  // SUI
  "0xb7844e289a8410e50fb3ca48d69eb9cf29e27d223ef90353fe1bd8e27ff8f3f8::coin::COIN", // wSUI
  // FUD
  "0x76cb819b01abed502bee8a702b4c2d547532c12f25001c9dea795a5e631c26f1::fud::FUD",
  // BLUB
  "0xfa7ac3951fdca92c5200d468d31a365eb03b2be9936fde615e69f0c1274ad3a0::blub::BLUB",
  // HASUI
  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::hasui::HASUI",
  // VOLO
  "0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT",
  // AAA
  "0x7a4ed2c9e3ce2af5d5fd2fe0c3f65a77c29d0c7a0b49e3a7e9c9b8d5e2b7f1a3::aaa::AAA",
]);

// Fetch prices from multiple sources
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, coinTypes } = body;

    const prices: Record<string, TokenPrice> = {};

    // Try Blockberry first (requires API key in production)
    if (address) {
      try {
        const blockberryResponse = await fetch(
          `https://api.blockberry.one/sui/v1/accounts/${address}/coins?page=0&size=100`,
          {
            headers: {
              "Accept": "application/json",
            },
          }
        );

        if (blockberryResponse.ok) {
          const data = await blockberryResponse.json();
          const tokens = data.content || data.data || [];
          
          if (Array.isArray(tokens)) {
            tokens.forEach((token: Record<string, unknown>) => {
              const coinType = token.coinType as string;
              if (coinType) {
                prices[coinType] = {
                  coinType,
                  price: (token.price as number) || 0,
                  symbol: token.symbol as string,
                  decimals: token.decimals as number,
                  logo: token.iconUrl as string,
                  usdValue: token.usdValue as number,
                  verified: Boolean(token.verified),
                };
              }
            });
          }
        }
      } catch (err) {
        console.error("[API] Blockberry error:", err);
      }
    }

    // Try Cetus default token list for verified tokens
    try {
      const cetusResponse = await fetch(
        "https://api-sui.cetus.zone/v2/sui/default_token_list",
        {
          headers: { "Accept": "application/json" },
          next: { revalidate: 3600 }, // Cache for 1 hour
        }
      );

      if (cetusResponse.ok) {
        const data = await cetusResponse.json();
        console.log("[API] Cetus token list response structure:", Object.keys(data));
        
        // The API returns { code, msg, data: { lp_list: [...] } }
        const tokenList = data?.data?.lp_list || data?.lp_list || [];
        console.log("[API] Cetus verified tokens count:", tokenList.length);
        
        if (Array.isArray(tokenList)) {
          tokenList.forEach((token: Record<string, unknown>) => {
            // Cetus API uses 'address' field for coin type
            const coinType = (token.address || token.coin_type || token.type) as string;
            if (coinType) {
              // Mark as verified if it's in Cetus default list
              if (prices[coinType]) {
                prices[coinType].verified = true;
                // Also update logo if available from Cetus
                if (token.icon || token.logo_url || token.logoURI) {
                  prices[coinType].logo = (token.icon || token.logo_url || token.logoURI) as string;
                }
              } else {
                prices[coinType] = {
                  coinType,
                  price: (token.price as number) || 0,
                  symbol: token.symbol as string,
                  decimals: token.decimals as number,
                  logo: (token.icon || token.logo_url || token.logoURI) as string,
                  verified: true,
                };
              }
            }
          });
        }
      }
    } catch (err) {
      console.error("[API] Cetus token list error:", err);
    }

    // Fetch individual prices from DexScreener for missing tokens
    if (coinTypes && Array.isArray(coinTypes)) {
      for (const coinType of coinTypes) {
        if (prices[coinType]?.price) continue; // Already have price
        if (coinType === "0x2::sui::SUI") continue; // Skip SUI

        try {
          const response = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(coinType)}`
          );

          if (response.ok) {
            const data = await response.json();
            if (data.pairs && data.pairs.length > 0) {
              const pair = data.pairs[0];
              prices[coinType] = {
                coinType,
                price: parseFloat(pair.priceUsd) || 0,
                symbol: pair.baseToken?.symbol,
                logo: pair.info?.imageUrl,
              };
            }
          }
        } catch {
          // Continue to next token
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Get SUI price
    let suiPrice = 0.95; // Fallback
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd"
      );
      if (response.ok) {
        const data = await response.json();
        if (data.sui?.usd) {
          suiPrice = data.sui.usd;
        }
      }
    } catch {
      // Use fallback price
    }

    // Apply known verified tokens status
    for (const coinType of Object.keys(prices)) {
      if (KNOWN_VERIFIED_TOKENS.has(coinType)) {
        prices[coinType].verified = true;
      }
    }

    // Also check any requested coinTypes that might be verified
    if (coinTypes && Array.isArray(coinTypes)) {
      for (const coinType of coinTypes) {
        if (KNOWN_VERIFIED_TOKENS.has(coinType)) {
          if (prices[coinType]) {
            prices[coinType].verified = true;
          } else {
            prices[coinType] = {
              coinType,
              price: 0,
              verified: true,
            };
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      prices,
      suiPrice,
    });
  } catch (error) {
    console.error("[API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}
