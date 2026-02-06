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
│  │  │   DustVault   │  │  TokenVaults  │  │  Cetus Pools   │  ││
│  │  │   (Shared)    │  │   <T> each    │  │   (Liquidity)  │  ││
│  │  └───────────────┘  └───────────────┘  └────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Contract (DustDAO)

```
┌──────────────────────────────────────────────────────────────┐
│                        DustVault                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ • admin: address                                       │  │
│  │ • user_shares: Table<address, u64>  (USD value)       │  │
│  │ • total_shares: u64                                    │  │
│  │ • sui_rewards: Balance<SUI>                            │  │
│  │ • staked_sui: Balance<SUI>                             │  │
│  │ • round: u64                                           │  │
│  │ • total_fees_collected: u64                            │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
            │
            │ One vault per token type
            ▼
┌──────────────────────┐  ┌──────────────────────┐
│  TokenVault<USDC>    │  │  TokenVault<CETUS>   │  ...
│  balance: Balance<T> │  │  balance: Balance<T> │
└──────────────────────┘  └──────────────────────┘
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
   ├─ Merge all USDC coins → Swap via Cetus → SUI
   ├─ Merge all CETUS coins → Swap via Cetus → SUI
   ├─ Merge all BUCK coins → Swap via Cetus → SUI
   └─ ... (all tokens in parallel)

4. Result:
   └─ All dust tokens = 0 balance
   └─ You receive: X SUI (consolidated)
```

### Mode 2: DustDAO Pool (Community Vault)

```
Phase 1: DEPOSIT
────────────────
User A deposits: 0.5 USDC ($0.50) + 0.03 SCA ($0.01) = $0.51 shares
User B deposits: 0.8 USDC ($0.80) + 15 NAVI ($3.00) = $3.80 shares  
User C deposits: 1.2 USDC ($1.20)                    = $1.20 shares

Vault Total: $5.51 (551 shares)

Notes: Token vaults are **automatically created on-chain** when users deposit a new token type. Tokens are **locked in the DustVault system** (per-token vaults) — not sent to an admin wallet — ensuring non-custodial, trustless deposits.

Phase 2: BATCH SWAP (Admin/Keeper)
──────────────────────────────────
Admin clicks "Batch Swap All Dust"
├─ Admin wallet pays gas: ~$2 (reimbursed from fee)
├─ Contract swaps all tokens via Cetus
├─ Total SUI received: 100 SUI
└─ Auto fee deduction:
   ├─ 2% (2 SUI) → Admin (gas reimbursement + incentive)
   └─ 98% (98 SUI) → User rewards pool

Phase 3: CLAIM (Users)
──────────────────────
User A ($0.51 / $5.51) = 9.3% → Claims 9.1 SUI
User B ($3.80 / $5.51) = 69.0% → Claims 67.6 SUI
User C ($1.20 / $5.51) = 21.8% → Claims 21.4 SUI

Alternative: Auto-Stake → SUI goes to staking pool for yield
```

### Governance (Future)

All DustDAO members receive voting power based on lifetime contributions:

```
Voting Power = Lifetime Shares Contributed

Proposals can include:
• Fee adjustments
• New token support
• Protocol upgrades
• Treasury allocation
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
| **DEX** | Cetus Aggregator API |
| **State** | React Query (@tanstack/react-query) |

---

## 📦 Smart Contract

### Deployed Addresses (Mainnet)

| Object | Address |
|--------|---------|
| **Package ID** | `0xcbcb622f6a47404be4c28d75dc47fdc0abfd2e8a730eb104495a404e5b2c56e4` |
| **DustVault** | `0xf0c002e13c121a72b12d39d3e6d1a99c10792ee5c3d539bb1c6b28c778beb720` |
| **AdminCap** | `0x5e270e3af10a6085119ea5f5b2e479dfcbd4a451abba02f3aa1463b81394a8a3` |

**Deployment TX (v2 - Security Update)**: [FvZF4YnoQ6TxnpkxJfZUxdyWkwpkoF3f71x4s4rWR2g3](https://suiscan.xyz/mainnet/tx/FvZF4YnoQ6TxnpkxJfZUxdyWkwpkoF3f71x4s4rWR2g3)

### Key Functions

```move
// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL MODE
// ═══════════════════════════════════════════════════════════════

/// Log individual swap for analytics (called in PTB after Cetus swap)
public fun log_individual_swap<T>(
    amount: u64, 
    sui_received: u64, 
    clock: &Clock, 
    ctx: &TxContext
)

// ═══════════════════════════════════════════════════════════════
// POOL MODE (DustDAO)
// ═══════════════════════════════════════════════════════════════

/// Deposit dust with USD value (shares = USD value * 1e6)
public fun deposit_dust<T>(
    vault: &mut DustVault, 
    token_vault: &mut TokenVault<T>, 
    dust_coin: Coin<T>, 
    usd_value: u64, 
    clock: &Clock, 
    ctx: &mut TxContext
)

/// Admin: Deposit SUI rewards with auto 2% fee deduction
public fun deposit_sui_rewards_with_fee(
    admin: &AdminCap,
    vault: &mut DustVault,
    sui_coin: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext
): Coin<SUI>  // Returns admin fee

/// User: Claim SUI rewards (proportional to shares)
public fun claim_rewards(
    vault: &mut DustVault, 
    receipt: DepositReceipt, 
    membership: &mut DustDAOMembership, 
    clock: &Clock, 
    ctx: &mut TxContext
): Coin<SUI>

/// User: Auto-stake rewards instead of claiming
public fun stake_rewards(
    vault: &mut DustVault, 
    receipt: DepositReceipt,
    membership: &mut DustDAOMembership, 
    clock: &Clock
)

// ═══════════════════════════════════════════════════════════════
// GOVERNANCE
// ═══════════════════════════════════════════════════════════════

/// Vote on proposal (voting power = lifetime_shares)
public fun vote(
    proposal: &mut Proposal, 
    membership: &DustDAOMembership, 
    vote_for: bool, 
    clock: &Clock
)
```

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

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/sui-dust-vacuum.git
cd sui-dust-vacuum

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

### Build Smart Contract

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

## 📁 Project Structure

```
sui-dust-vacuum/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout with fonts
│   │   ├── page.tsx            # Main page
│   │   ├── providers.tsx       # Sui + React Query providers
│   │   └── api/prices/         # Price API route
│   ├── components/
│   │   ├── dust/               # Main vacuum components
│   │   │   ├── DustVacuum.tsx  # Main container
│   │   │   ├── TokenCard.tsx   # Display dust tokens
│   │   │   ├── VacuumButton.tsx# Action button
│   │   │   ├── DustDAOPool.tsx # Pool mode UI
│   │   │   ├── AdminPanel.tsx  # Admin controls
│   │   │   └── ...             # Other dust components
│   │   ├── effects/            # Animation components
│   │   └── layout/             # Header, Footer, Features
│   ├── hooks/
│   │   ├── useDustVacuum.ts    # Main vacuum logic + PTB
│   │   ├── useDustDAO.ts       # Pool mode logic
│   │   └── useTokenBalances.ts # Fetch wallet balances
│   ├── lib/
│   │   ├── constants.ts        # Contract addresses, config
│   │   ├── tokens.ts           # Token definitions
│   │   └── utils.ts            # Helper functions
│   └── types/
│       ├── index.ts            # TypeScript types
│       └── dustdao.ts          # DustDAO types
├── contracts/
│   └── dust_vacuum/
│       ├── sources/
│       │   └── dust_vacuum.move # Smart contract (Move 2024)
│       ├── tests/              # Move tests
│       └── Move.toml           # Move config (edition = "2024")
├── public/                     # Static assets
├── AI_DISCLOSURE.md            # AI assistance disclosure
└── package.json
```

---

## 🔒 Security Considerations

- **Non-custodial**: Users always control their assets
- **Open Source**: Smart contract code is fully auditable on-chain
- **PTB Safety**: Atomic transactions - all swaps succeed or all fail
- **Slippage Protection**: Configurable slippage tolerance (default 0.5%)
- **Price Feeds**: USD values from DexScreener API
- **USD Value Cap**: Max $100 per deposit to prevent manipulation
- **Admin Access**: AdminCap-based access control

See [SECURITY.md](SECURITY.md) for full security audit report.

---

## 🗺️ Roadmap

- [x] **v1.0** - Individual vacuum mode
- [x] **v1.1** - Smart contract deployment (mainnet)
- [x] **v2.0** - DustDAO pool mode UI
- [x] **v2.1** - Security audit & fixes
- [ ] **v3.0** - Auto-stake integration
- [ ] **v3.1** - Governance voting UI
- [ ] **v4.0** - Mobile-responsive redesign

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
- **Cetus Protocol** - For the aggregator API and DEX infrastructure
- **Mysten Labs** - For the SDK and developer tooling

---

## 📞 Links

- **🌐 Live Demo**: [https://sui-dust-vacuum.vercel.app](https://sui-dust-vacuum.vercel.app)
- [Sui Network](https://sui.io)
- [Cetus Protocol](https://cetus.zone)
- [Sui Explorer](https://suiscan.xyz/mainnet)
- [Contract on Explorer](https://suiscan.xyz/mainnet/object/0xcbcb622f6a47404be4c28d75dc47fdc0abfd2e8a730eb104495a404e5b2c56e4)
- [GitHub Repository](https://github.com/muhammadtakdir/sui-dust-vacuum)

---


