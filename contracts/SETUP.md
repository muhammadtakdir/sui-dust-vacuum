# Sui Dust Vacuum - Smart Contract Setup Guide

## Prerequisites

### 1. Install Rust (Required for Sui CLI)

**Option A: Via rustup (Recommended)**
```powershell
# Download and run rustup installer
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe -y
# Restart terminal after installation
```

**Option B: Via Chocolatey (Run as Administrator)**
```powershell
choco install rustup.install -y
```

### 2. Install Sui CLI

After Rust is installed, install Sui CLI:

```powershell
# Install Sui CLI from crates.io
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet-v1.37.1 sui
```

### 3. Verify Installation

```powershell
sui --version
# Should output: sui 1.37.1-...
```

## Configure Sui Client

### 1. Initialize Sui Client

```powershell
sui client new-env --alias mainnet --rpc https://fullnode.mainnet.sui.io:443
sui client switch --env mainnet
```

### 2. Create/Import Wallet

**Create new wallet:**
```powershell
sui client new-address ed25519
# Save the mnemonic phrase securely!
```

**Or import existing:**
```powershell
sui keytool import "<YOUR_MNEMONIC_PHRASE>" ed25519
```

## Build & Deploy Contract

### 1. Navigate to Contract Directory

```powershell
cd contracts/dust_vacuum
```

### 2. Build Contract

```powershell
sui move build
```

### 3. Run Tests

```powershell
sui move test
```

### 4. Deploy to Mainnet

```powershell
sui client publish --gas-budget 500000000
```

Save the output - you'll need:
- **Package ID**: The deployed contract address
- **Transaction Digest**: Proof of deployment

## Update Frontend with Contract Address

After deployment, update `src/lib/constants.ts`:

```typescript
export const DUST_VACUUM_CONTRACT = {
  mainnet: {
    PACKAGE_ID: "0xc66313cc4815b4fc6ecd2bdf4ccbf3c0277da40b2cb2562c6ab996b91b25c9c5", // Your new Package ID
    DUST_VAULT_ID: "0xb8164ae8b51ac2d79d94fd6f653815db6d1543c4fc0d534133043a907e8c40f1", // Your new Vault ID
    ADMIN_CAP_ID: "0x4de73e07b3f08b32d52403e06e6029ff50b3e727811fc548891d9dfc70ddf1e2", // Your Admin Cap ID
  },
};
```

## Core Contract Functions (v3)

### 1. `deposit_dust<T>`
Deposits tokens into the unified Bag storage.

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::deposit_dust`,
  typeArguments: [coinType],
  arguments: [
    tx.object(DUST_VAULT_ID),
    tx.object(coinObject),
    tx.pure.u64(usdValue),
    tx.object("0x6"), // Clock
  ],
});
```

### 2. `log_individual_swap<T>`
Logs a direct swap operation for analytics.

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::log_individual_swap`,
  typeArguments: [coinType],
  arguments: [
    tx.pure.u64(amountIn),
    tx.pure.u64(amountOut),
    tx.object("0x6"), // Clock
  ],
});
```

### 3. `deposit_sui_rewards_with_fee`
Admin function to finalize a round and distribute rewards.

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::deposit_sui_rewards_with_fee`,
  arguments: [
    tx.object(ADMIN_CAP_ID),
    tx.object(DUST_VAULT_ID),
    tx.object(suiCoin),
    tx.object("0x6"), // Clock
  ],
});
```

## Verify Deployment

After deployment, verify on Sui Explorer:
- Mainnet: https://suiscan.xyz/mainnet/object/<PACKAGE_ID>