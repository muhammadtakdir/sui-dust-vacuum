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

**Option C: Via Scoop**
```powershell
scoop install rustup
rustup-init -y
```

### 2. Install Sui CLI

After Rust is installed, install Sui CLI:

```powershell
# Install Sui CLI from crates.io
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet-v1.37.1 sui

# Or install specific version
cargo install --locked sui@1.37.1
```

**Alternative: Download Pre-built Binary**
1. Go to https://github.com/MystenLabs/sui/releases
2. Download `sui-mainnet-v1.37.1-windows-x86_64.tgz`
3. Extract and add to PATH

### 3. Verify Installation

```powershell
sui --version
# Should output: sui 1.37.1-...
```

## Configure Sui Client

### 1. Initialize Sui Client

```powershell
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
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

### 3. Get Testnet SUI

```powershell
# Request testnet SUI from faucet
sui client faucet

# Check balance
sui client gas
```

## Build & Deploy Contract

### 1. Navigate to Contract Directory

```powershell
cd d:\takdir\sui-dust-vacum\contracts\dust_vacuum
```

### 2. Build Contract

```powershell
sui move build
```

Expected output:
```
BUILDING dust_vacuum
```

### 3. Run Tests

```powershell
sui move test
```

### 4. Deploy to Testnet

```powershell
sui client publish --gas-budget 100000000
```

Save the output - you'll need:
- **Package ID**: The deployed contract address
- **Transaction Digest**: Proof of deployment

Example output:
```
╭─────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                        │
│  ┌──                                                                    │
│  │ ObjectID: 0x1234...                                                  │
│  │ ObjectType: 0x2::package::UpgradeCap                                 │
│  └──                                                                    │
│ Published Objects:                                                      │
│  ┌──                                                                    │
│  │ PackageID: 0xabcd...  <-- THIS IS YOUR CONTRACT ADDRESS              │
│  └──                                                                    │
╰─────────────────────────────────────────────────────────────────────────╯
```

## Update Frontend with Contract Address

After deployment, update `src/lib/constants.ts`:

```typescript
export const DUST_VACUUM_CONTRACT = {
  testnet: {
    PACKAGE_ID: "0x<YOUR_PACKAGE_ID>",
  },
  mainnet: {
    PACKAGE_ID: "", // Deploy to mainnet later
  },
};
```

## Contract Functions

### 1. `burn_dust<T>`
Burns dust by sending to dead address (0x0).

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::burn_dust`,
  typeArguments: [coinType],
  arguments: [
    tx.object(coinObjectId),
    tx.object("0x6"), // Clock
  ],
});
```

### 2. `log_swap<T>`
Logs a swap operation (called after Cetus swap).

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::log_swap`,
  typeArguments: [coinType],
  arguments: [
    tx.pure.u64(amount),
    tx.object("0x6"), // Clock
  ],
});
```

### 3. `log_batch_complete`
Logs completion of batch vacuum.

```typescript
tx.moveCall({
  target: `${PACKAGE_ID}::vacuum::log_batch_complete`,
  arguments: [
    tx.pure.u64(tokensCount),
    tx.pure.u64(totalSuiReceived),
    tx.object("0x6"), // Clock
  ],
});
```

## Verify Deployment

After deployment, verify on Sui Explorer:
- Testnet: https://suiscan.xyz/testnet/object/<PACKAGE_ID>
- Mainnet: https://suiscan.xyz/mainnet/object/<PACKAGE_ID>

## Troubleshooting

### Build Errors

1. **"Cannot find module"**: Run `sui move build` from the contract directory
2. **"Version mismatch"**: Update Move.toml to match your Sui CLI version

### Deployment Errors

1. **"Insufficient gas"**: Increase gas budget or get more testnet SUI
2. **"Object not found"**: Wait for faucet transaction to confirm

### Windows-Specific Issues

1. **Long path errors**: Enable long paths in Windows
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
     -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

2. **SSL/TLS errors**: Update PowerShell security protocol
   ```powershell
   [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
   ```
