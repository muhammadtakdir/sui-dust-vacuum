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
