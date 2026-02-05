# Security Audit Report - Sui Dust Vacuum / DustDAO

## Overview

This document outlines the security considerations, known limitations, and mitigations implemented in the Sui Dust Vacuum / DustDAO project.

## Smart Contract Security

### Access Control

| Function | Access Level | Protection |
|----------|-------------|------------|
| `deposit_dust<T>` | Public | Vault must be open |
| `claim_rewards` | Public | Requires valid receipt (burned on use) |
| `stake_rewards` | Public | Requires valid receipt (burned on use) |
| `withdraw_staked` | Public | Requires membership with staked balance |
| `vote` | Public | Requires membership with voting power |
| `open_vault` | Admin | Requires AdminCap |
| `close_vault` | Admin | Requires AdminCap |
| `new_round` | Admin | Requires AdminCap |
| `create_token_vault<T>` | Admin | Requires AdminCap |
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

```typescript
// Frontend validation
if (totalUsdValue > MAX_DUST_VALUE_USD) {
  throw new Error(`Total deposit exceeds maximum allowed`);
}
```

#### 2. Double-Claim Prevention

**Risk:** Users could claim rewards multiple times with the same receipt.

**Mitigation:** Receipt is destructured and burned on claim/stake:

```move
let DepositReceipt { id, depositor, shares, round, reward_preference: _ } = receipt;
object::delete(id);  // Receipt is burned
```

#### 3. Round Mismatch Prevention

**Risk:** Users could use old receipts to claim rewards from new rounds.

**Mitigation:** Round validation:

```move
assert!(round == vault.round, EWrongRound);
```

#### 4. Integer Overflow Prevention

**Risk:** Share calculation could overflow with large values.

**Mitigation:** Using u128 for intermediate calculations:

```move
let user_sui = ((shares as u128) * (total_sui as u128) / (vault.total_shares as u128)) as u64;
```

#### 5. Admin Fee Transparency

**Risk:** Hidden fee extraction.

**Mitigation:** 
- Fee is a public constant: `ADMIN_FEE_BPS = 200` (2%)
- Event emitted with fee details: `BatchSwapCompleteEvent`
- Total fees tracked: `vault.total_fees_collected`

## Known Limitations

### 1. Trusted USD Value Input

**Issue:** USD value is passed from the frontend and not verified on-chain.

**Current Mitigation:** Maximum value cap ($100)

**Recommended for Production:**
- Integrate on-chain price oracle (Pyth Network, Switchboard)
- Implement server-side price verification
- Add rate limiting per user

### 2. Admin Centralization

**Issue:** Single admin can:
- Close vault (prevent deposits)
- Start new round (reset shares)
- Create token vaults

**Current Mitigation:** 
- Admin wallet is publicly known
- Events emitted for all admin actions
- Community can monitor via Sui Explorer

**Recommended for Production:**
- Implement multi-sig admin (e.g., 2-of-3)
- Add timelock for critical operations
- Transition to full DAO governance

### 3. No Guaranteed Rewards

**Issue:** If admin doesn't deposit SUI rewards, users with receipts cannot claim.

**Current Mitigation:** None (by design - admin must execute batch swap)

**Recommended for Production:**
- Implement keeper/bot automation
- Add minimum reward guarantee mechanism

## Frontend Security

### Validated
- ✅ No API keys or secrets in source code
- ✅ Admin wallet is read-only check (actual access requires AdminCap)
- ✅ Input validation on deposit amounts
- ✅ Proper error handling

### Constants Exposure (Intentional)
```typescript
// Public addresses - these are intentionally exposed
PACKAGE_ID: "0x55422768ae1283fe6373602f11b4f21aa55ab57e2835182831e550c397e6fb60"
DUST_VAULT_ID: "0x3793eea34e0a2124a5015c59e20acc8400b2a3420061f9418f1cbf42e4a0f578"
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

## Audit Status

- [x] Self-audit completed
- [ ] Third-party audit (not required for hackathon)
- [ ] Bug bounty program (not implemented)

## Reporting Security Issues

For security concerns, please contact the admin wallet holder or open an issue on GitHub.

---

*Last Updated: February 2026*
*Version: 1.0.0*
