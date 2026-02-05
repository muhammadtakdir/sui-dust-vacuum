import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sui Dust Vacuum - Clean Your Wallet",
  description: "Swap your dust tokens into SUI in a single transaction. Built on Sui Network with Cetus Aggregator.",
  keywords: ["Sui", "DeFi", "Dust", "Swap", "Cetus", "Blockchain"],
  authors: [{ name: "Sui Dust Vacuum Team" }],
  openGraph: {
    title: "Sui Dust Vacuum",
    description: "Clean up your wallet - swap dust tokens to SUI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-sui-darker min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
