# Security Audit Report - Sui Dust Vacuum / DustDAO

## Overview

This document outlines the security considerations, known limitations, and mitigations implemented in the Sui Dust Vacuum / DustDAO project.

## Smart Contract Security

### Access Control

| Function | Access Level | Protection |
|----------|-------------|------------|
| `deposit_dust<T>` | Public | Vault must be open, Value check |
| `claim_rewards` | Public | Requires valid receipt (burned on use) |
| `stake_rewards` | Public | Requires valid receipt (burned on use) |
| `withdraw_staked` | Public | Requires membership with staked balance |
| `vote` | Public | Requires membership with voting power |
| `open_vault` | Admin | Requires AdminCap |
| `close_vault` | Admin | Requires AdminCap |
| `set_target_usd_value` | Admin | Requires AdminCap |
| `withdraw_for_swap<T>` | Admin | Requires AdminCap |
| `deposit_sui_rewards_with_fee` | Admin | Requires AdminCap |

### Security Features Implemented

#### 1. USD Value Manipulation Prevention

**Risk:** Users could submit inflated USD values to claim more shares than deserved.

**Mitigation:**
- Smart Contract: `MAX_USD_VALUE = 100_000_000` ($100 scaled by 1e6)
- Frontend: `MAX_DUST_VALUE_USD = 100`, `MIN_DUST_VALUE_USD = 0.001`
- Validation in both `deposit_dust()` and `depositDust()` hook

```move
// Smart contract validation
assert!(usd_value <= MAX_USD_VALUE, EValueTooHigh);
```

#### 2. Double-Claim Prevention

**Risk:** Users could claim rewards multiple times with the same receipt.

**Mitigation:** Receipt is destructured and burned on claim/stake:

```move
let DepositReceipt { id, ... } = receipt;
object::delete(id);  // Receipt is burned
```

#### 3. Round Mismatch Prevention

**Risk:** Users could use old receipts to claim rewards from new rounds.

**Mitigation:** Round validation logic ensures receipts are only valid for their specific finalized round history entry.

#### 4. Unified Token Storage (Bag)

**Risk:** Fragmentation or loss of tokens in separate vault objects.

**Mitigation:** 
- v3 uses a unified `Bag` within the `DustVault` to store all deposited tokens.
- Simplifies logic and reduces object management overhead.

#### 5. Admin Fee Transparency

**Risk:** Hidden fee extraction.

**Mitigation:** 
- Fee is a public constant: `ADMIN_FEE_BPS = 200` (2%)
- Event emitted with fee details: `BatchSwapCompleteEvent`
- Total fees tracked: `vault.total_fees_collected`

## Known Limitations

### 1. Trusted USD Value Input

**Issue:** USD value is passed from the frontend and not verified on-chain.

**Current Mitigation:** Maximum value cap ($100). This is acceptable for a "dust" cleaner.

**Recommended for Production:**
- Integrate on-chain price oracle (Pyth Network)
- Implement server-side price verification

### 2. Admin Centralization

**Issue:** Single admin can:
- Close vault
- Set target
- Execute batch swap

**Current Mitigation:** 
- Admin wallet is publicly known
- Events emitted for all admin actions
- Admin cannot withdraw user funds arbitrarily (can only withdraw for swap/distribution flow)

### 3. Asynchronous Rewards

**Issue:** Users must wait for the admin to finalize the round before claiming.

**Current Mitigation:** 
- UI clearly displays "Collecting" vs "Claimable" status.
- Admin incentivized by 2% fee to process rounds quickly.

## Frontend Security

### Validated
- ✅ No API keys or secrets in source code
- ✅ Admin wallet is read-only check (actual access requires AdminCap)
- ✅ Input validation on deposit amounts
- ✅ Proper error handling

### Constants Exposure (Intentional)
```typescript
// Public addresses - these are intentionally exposed
PACKAGE_ID: "0xc66313cc4815b4fc6ecd2bdf4ccbf3c0277da40b2cb2562c6ab996b91b25c9c5"
DUST_VAULT_ID: "0xb8164ae8b51ac2d79d94fd6f653815db6d1543c4fc0d534133043a907e8c40f1"
ADMIN_CAP_ID: "0x4de73e07b3f08b32d52403e06e6029ff50b3e727811fc548891d9dfc70ddf1e2"
ADMIN_WALLET: "0xe087a0ab3b923216b1792aa6343efa5b6bdd90c7c684741e047c3b9b5629e077"
```

## Error Codes Reference

| Code | Name | Description |
|------|------|-------------|
| 0 | EVaultClosed | Vault is closed for deposits |
| 1 | EVaultEmpty | No balance/rewards available |
| 2 | ENoShares | User has no shares to claim |
| 3 | EWrongRound | Receipt round doesn't match current |
| 4 | EZeroValue | Deposit value must be > 0 |
| 5 | EAlreadyVoted | User already voted on proposal |
| 6 | EProposalNotActive | Proposal is closed/expired |
| 7 | ENoVotingPower | User has no voting power |
| 8 | EValueTooHigh | USD value exceeds maximum ($100) |
| 9 | ERoundNotFinalized | Round rewards not yet deposited |

---

*Last Updated: February 6, 2026*
*Version: v3.0 (Unified Vault)*