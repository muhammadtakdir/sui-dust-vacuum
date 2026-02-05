# AI Tool Disclosure 🤖

> As required by the hackathon rules, this document discloses all AI tools used during the development of **Sui Dust Vacuum**.

## Overview

This project utilized AI assistance for code generation, architecture design, and documentation. Below is a comprehensive record of the tools used and the key prompts that guided the development.

---

## AI Tools Used

| Tool | Model/Version | Purpose |
|------|---------------|---------|
| Claude (Anthropic) | Claude Opus 4.5 | Code generation, architecture, debugging |

---

## Key Prompts & Solutions

### 1. Project Initialization

**Prompt:**
```
Create a hackathon project "Sui Dust Vacuum" - a dApp that swaps small token balances ("dust") 
into SUI using Cetus Aggregator. Use Next.js 14, TypeScript, Tailwind CSS, @mysten/dapp-kit.
```

**Result:** Complete Next.js 14 project with TypeScript, Tailwind CSS, wallet integration, and Cetus API setup.

---

### 2. PTB Vacuum Logic

**Prompt:**
```
Create useDustVacuum hook that:
- Uses Cetus Aggregator API for swap routes
- Builds single PTB to merge coins and swap ALL dust to SUI
- Goal: Token balance becomes EXACTLY 0
```

**Result:** `useDustVacuum.ts` hook with route checking, coin merging, and atomic PTB execution.

---

### 3. DustDAO Smart Contract (Move 2024)

**Prompt:**
```
Create DustDAO smart contract with:
- Community vault (DustVault shared object)
- Shares tracking by USD value
- 2% admin fee for gas reimbursement
- Claim or auto-stake rewards
- Governance voting
Use Move 2024 Edition syntax.
```

**Result:** 
- `dust_vacuum.move` with DustVault, TokenVault<T>, DustDAOMembership, DepositReceipt, Proposal
- Deployed to mainnet

---

### 4. Pool Mode UI

**Prompt:**
```
Create DustDAO Pool Mode UI components:
- PoolModeSelector (Individual/Pool toggle)
- VaultStats (vault info display)
- DepositPanel (deposit dust to vault)
- RewardsPanel (claim/stake rewards)
- AdminPanel (admin functions)
- GovernancePanel (voting)
```

**Result:** Complete Pool Mode UI with useDustDAO hook and 6 interactive components.

---

### 5. Security Audit & Fixes

**Prompt:**
```
Check for security vulnerabilities that could be exploited to steal funds or disrupt the system.
Fix issues and remove unnecessary files.
```

**Result:**
- Added `MAX_USD_VALUE = 100_000_000` validation in contract
- Added frontend validation for USD values
- Added `EValueTooHigh` error code (8)
- Created SECURITY.md documentation
- Removed planning files

---

## Smart Contract Summary

| Feature | Implementation |
|---------|----------------|
| Individual Swap Logging | `log_individual_swap<T>` |
| Community Vault | `DustVault` shared object |
| Multi-Token Support | `TokenVault<T>` generic |
| Membership NFT | `DustDAOMembership` |
| Governance | `Proposal` with voting |
| Fee System | 2% admin fee (200 BPS) |
| Security | Max $100 USD per deposit |

---

## Deployed Contract (Mainnet v2 - Security Update)

| Object | Address |
|--------|---------|
| Package ID | `0xcbcb622f6a47404be4c28d75dc47fdc0abfd2e8a730eb104495a404e5b2c56e4` |
| DustVault | `0xf0c002e13c121a72b12d39d3e6d1a99c10792ee5c3d539bb1c6b28c778beb720` |
| AdminCap | `0x5e270e3af10a6085119ea5f5b2e479dfcbd4a451abba02f3aa1463b81394a8a3` |

TX: [FvZF4YnoQ6TxnpkxJfZUxdyWkwpkoF3f71x4s4rWR2g3](https://suiscan.xyz/mainnet/tx/FvZF4YnoQ6TxnpkxJfZUxdyWkwpkoF3f71x4s4rWR2g3)

---

## Human Contributions

- Architecture decisions and project structure
- Design direction and animation timing
- Manual testing of wallet connections and swaps
- Debugging integration issues
- Deployment configuration

---

## Transparency Note

This disclosure complies with the hackathon requirement to document AI tool usage. All generated code was reviewed, tested, and modified by human developers. AI served as a development accelerator, not a replacement for human judgment.

---

*Last Updated: February 5, 2026*
