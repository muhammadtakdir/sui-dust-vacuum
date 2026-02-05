import { NextResponse } from "next/server";

interface TokenPrice {
  coinType: string;
  price: number;
  symbol?: string;
  decimals?: number;
  logo?: string;
  usdValue?: number;
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
                };
              }
            });
          }
        }
      } catch (err) {
        console.error("[API] Blockberry error:", err);
      }
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
