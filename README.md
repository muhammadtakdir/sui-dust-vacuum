# 🧹 Sui Dust Vacuum / DustDAO

> **Clean your wallet. Earn together.**

A community-driven dust cleaner dApp built on Sui Network with Cetus Aggregator integration. Transform those frustrating micro-balances into real value.

## 🌐 Live Demo: [https://sui-dust-vacuum.vercel.app](https://sui-dust-vacuum.vercel.app)

![Sui Dust Vacuum](https://img.shields.io/badge/Built%20on-Sui%20Network-4DA2FF?style=for-the-badge)
![Cetus Integration](https://img.shields.io/badge/Powered%20by-Cetus%20Aggregator-00D4AA?style=for-the-badge)
![Move 2024](https://img.shields.io/badge/Smart%20Contract-Move%202024-FF6B6B?style=for-the-badge)
![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-000000?style=for-the-badge&logo=vercel)

---

## 🎯 The Problem

Crypto users often rely on the "Max" button, but strict decimal math and gas buffers leave millions of wallets with frustrating "dust" balances:

- **$0.03 here, $0.10 there** - Too small to swap manually
- **Gas fees > dust value** - It costs more to swap than the dust is worth
- **Cluttered wallets** - 8+ tokens with tiny unusable balances
- **Lost value** - Collectively, billions in dust sits idle across chains

## ✨ The Solution

**Sui Dust Vacuum** solves this by:

1. **Individual Mode**: Batch ALL your dust tokens into ONE transaction via PTB (Programmable Transaction Block)
2. **Pool Mode (DustDAO)**: Community vault where users pool dust together for gas-efficient batch swaps

### Key Innovation: Token Balance → EXACTLY 0

Unlike other tools that leave residual amounts, Sui Dust Vacuum uses Sui's unique PTB architecture to:
- Merge ALL coin objects of the same type
- Swap the ENTIRE balance in one atomic transaction
- Result: **Token balance becomes exactly 0**

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Sui Dust Vacuum                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Next.js   │───▶│  PTB Build  │───▶│  Cetus Aggregator   │ │
│  │   Frontend  │    │   Engine    │    │      Swap API       │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                                        │              │
│         ▼                                        ▼              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                  Sui Blockchain (Mainnet)                   ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  ││
│  │  │   DustVault   │  │ Unified Bag   │  │  Cetus Pools   │  ││
│  │  │   (Shared)    │  │   (All Coins) │  │   (Liquidity)  │  ││
│  │  └───────────────┘  └───────────────┘  └────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contract (DustDAO v3)

```
┌──────────────────────────────────────────────────────────────┐
│                        DustVault                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • admin: address                                       │  │
│  │ • tokens: Bag (Unified Storage)                        │  │
│  │ • history: Table<u64, RoundRewards>                    │  │
│  │ • current_round_shares: u64                            │  │
│  │ • target_usd_value: u64                                │  │
│  │ • current_usd_value: u64                               │  │
│  │ • staked_sui: Balance<SUI>                             │  │
│  │ • round: u64                                           │  │
│  │ • total_fees_collected: u64                            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎮 User Flows

### Mode 1: Individual Vacuum (Direct Swap)

```
1. Connect Wallet
   └─ App detects: "You have 8 dust tokens worth $1.23"

2. Click "Vacuum All" 
   └─ One-click to swap ALL dust to SUI

3. Behind the scenes (Single PTB):
   ├─ Merge all coins of each type
   ├─ Get optimized swap routes via Cetus Aggregator SDK
   ├─ Execute swaps using Cetus pool_script_v2
   └─ Transfer SUI back to user

4. Result:
   └─ All dust tokens = 0 balance
   └─ You receive: X SUI (consolidated)
```

### Mode 2: DustDAO Pool (Community Vault)

```
Phase 1: DEPOSIT (Active Round)
───────────────────────────────
User A deposits: 0.5 USDC ($0.50) + 0.03 SCA ($0.01) = $0.51 shares
User B deposits: 0.8 USDC ($0.80) + 15 NAVI ($3.00) = $3.80 shares  

Vault Status: Collecting (Current Value / Target Value)

Notes: Tokens are deposited into a unified Bag in the DustVault. Users receive a `DepositReceipt` tracking their share value and round number.

Phase 2: BATCH SWAP (Admin)
───────────────────────────
Admin closes vault when target is reached.
Admin executes batch swap of accumulated tokens to SUI.
Admin calls `deposit_sui_rewards_with_fee`:
├─ Deducts 2% fee (Gas reimbursement + incentive)
├─ Deposits remaining SUI into Round History
└─ Automatically starts new round

Phase 3: CLAIM (Users)
──────────────────────
User A checks "Your Rewards":
└─ Finds receipt from finalized Round #N
└─ Claims 98% of proportional SUI

Alternative: Auto-Stake → SUI goes to staking pool for yield
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Animation** | Framer Motion |
| **Wallet** | @mysten/dapp-kit |
| **Blockchain** | Sui Network (Mainnet) |
| **Smart Contract** | Move 2024 Edition |
| **DEX** | Cetus Aggregator SDK v3 |
| **State** | React Query (@tanstack/react-query) |

---

## 📦 Smart Contract

### Deployed Addresses (Mainnet)

| Object | Address |
|--------|---------|
| **Package ID** | `0xc66313cc4815b4fc6ecd2bdf4ccbf3c0277da40b2cb2562c6ab996b91b25c9c5` |
| **DustVault** | `0xb8164ae8b51ac2d79d94fd6f653815db6d1543c4fc0d534133043a907e8c40f1` |
| **AdminCap** | `0x4de73e07b3f08b32d52403e06e6029ff50b3e727811fc548891d9dfc70ddf1e2` |

### Fee Structure

| Fee | Rate | Purpose |
|-----|------|---------|
| Admin Fee | 2% | Gas reimbursement + Keeper incentive |
| User Rewards | 98% | Distributed proportionally by shares |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Sui Wallet (Sui Wallet, Suiet, Martian, etc.)

### Installation & Forking

If you want to run your own instance or contribute:

1. **Fork the repository** on GitHub.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sui-dust-vacuum.git
   cd sui-dust-vacuum
   ```

3. **Install dependencies**:
   ```bash
   npm install
   # or
   pnpm install
   ```

4. **Configure Environment**:
   - The project uses public mainnet constants by default.
   - If deploying your own contract, update `src/lib/constants.ts` with your new Package ID and Vault ID.

5. **Run development server**:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Build for production**:
   ```bash
   npm run build
   # or
   pnpm build
   ```

### Build Smart Contract (Optional)

If you want to modify or redeploy the contract:

```bash
# Navigate to contract directory
cd contracts/dust_vacuum

# Build with Sui CLI
sui move build

# Run tests
sui move test

# Deploy (mainnet)
sui client publish --gas-budget 500000000
```

---

## 🔒 Security Considerations

- **Non-custodial**: Users always control their assets via atomic swaps or claimable receipts.
- **Open Source**: Smart contract code is fully auditable.
- **PTB Safety**: Individual mode uses atomic PTBs - swaps either fully succeed or fail.
- **Slippage Protection**: Configurable slippage tolerance (default 0.5%).
- **Value Cap**: Max $100 per deposit in Pool Mode to prevent manipulation.
- **Admin Access**: AdminCap-based access control for vault management.

See [SECURITY.md](SECURITY.md) for full security audit report.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Sui Foundation** - For the amazing blockchain
- **Cetus Protocol** - For the aggregator SDK and liquidity
- **Mysten Labs** - For the SDK and developer tooling

---

## 📞 Links

- **🌐 Live Demo**: [https://sui-dust-vacuum.vercel.app](https://sui-dust-vacuum.vercel.app)
- [Sui Network](https://sui.io)
- [Cetus Protocol](https://cetus.zone)
- [Sui Explorer](https://suiscan.xyz/mainnet)
- [GitHub Repository](https://github.com/muhammadtakdir/sui-dust-vacuum)

---