# Sui Dust Vacuum - Setup Script
# Run this script in PowerShell as Administrator

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        Sui Dust Vacuum - Development Setup                 ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some installations may fail." -ForegroundColor Yellow
    Write-Host "   Consider running: Start-Process powershell -Verb RunAs" -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Step 1: Check Rust
Write-Host "📦 Step 1: Checking Rust installation..." -ForegroundColor Yellow
if (Test-Command "rustc") {
    $rustVersion = rustc --version
    Write-Host "   ✅ Rust is installed: $rustVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Rust not found. Installing..." -ForegroundColor Red
    
    # Download rustup
    $rustupUrl = "https://win.rustup.rs/x86_64"
    $rustupPath = "$env:TEMP\rustup-init.exe"
    
    Write-Host "   Downloading rustup..." -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $rustupUrl -OutFile $rustupPath -UseBasicParsing
        
        Write-Host "   Running rustup installer..." -ForegroundColor Cyan
        Start-Process -FilePath $rustupPath -ArgumentList "-y" -Wait
        
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "   ✅ Rust installed successfully!" -ForegroundColor Green
        Write-Host "   ⚠️  Please restart your terminal and run this script again." -ForegroundColor Yellow
    } catch {
        Write-Host "   ❌ Failed to install Rust: $_" -ForegroundColor Red
        Write-Host "   Please install manually from: https://rustup.rs" -ForegroundColor Yellow
    }
}

# Step 2: Check Sui CLI
Write-Host ""
Write-Host "📦 Step 2: Checking Sui CLI installation..." -ForegroundColor Yellow
if (Test-Command "sui") {
    $suiVersion = sui --version
    Write-Host "   ✅ Sui CLI is installed: $suiVersion" -ForegroundColor Green
} else {
    Write-Host "   ❌ Sui CLI not found." -ForegroundColor Red
    
    if (Test-Command "cargo") {
        Write-Host "   Installing Sui CLI via cargo (this may take 10-20 minutes)..." -ForegroundColor Cyan
        Write-Host "   Command: cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet-v1.37.1 sui" -ForegroundColor Gray
        
        $response = Read-Host "   Do you want to proceed? (y/n)"
        if ($response -eq "y" -or $response -eq "Y") {
            cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet-v1.37.1 sui
        } else {
            Write-Host "   Skipped Sui CLI installation." -ForegroundColor Yellow
        }
    } else {
        Write-Host "   Please install Rust first, then run this script again." -ForegroundColor Yellow
    }
}

# Step 3: Configure Sui for Testnet
Write-Host ""
Write-Host "📦 Step 3: Configuring Sui Client..." -ForegroundColor Yellow
if (Test-Command "sui") {
    # Check if testnet env exists
    $envList = sui client envs 2>&1
    if ($envList -match "testnet") {
        Write-Host "   ✅ Testnet environment already configured" -ForegroundColor Green
    } else {
        Write-Host "   Setting up testnet environment..." -ForegroundColor Cyan
        sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
    }
    
    # Switch to testnet
    sui client switch --env testnet
    Write-Host "   ✅ Switched to testnet" -ForegroundColor Green
    
    # Check for active address
    $activeAddress = sui client active-address 2>&1
    if ($activeAddress -match "0x") {
        Write-Host "   ✅ Active address: $activeAddress" -ForegroundColor Green
        
        # Check balance
        Write-Host "   Checking balance..." -ForegroundColor Cyan
        sui client gas
    } else {
        Write-Host "   Creating new wallet address..." -ForegroundColor Cyan
        sui client new-address ed25519
        Write-Host "   ⚠️  Save the mnemonic phrase shown above!" -ForegroundColor Yellow
    }
}

# Step 4: Request Testnet SUI
Write-Host ""
Write-Host "📦 Step 4: Requesting Testnet SUI..." -ForegroundColor Yellow
if (Test-Command "sui") {
    $response = Read-Host "   Request SUI from faucet? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "   Requesting from faucet..." -ForegroundColor Cyan
        sui client faucet
        Write-Host "   ✅ Faucet request sent. Wait a few seconds..." -ForegroundColor Green
        Start-Sleep -Seconds 5
        sui client gas
    }
}

# Step 5: Build Contract
Write-Host ""
Write-Host "📦 Step 5: Building Smart Contract..." -ForegroundColor Yellow
$contractPath = "d:\takdir\sui-dust-vacum\contracts\dust_vacuum"
if (Test-Path $contractPath) {
    Push-Location $contractPath
    
    if (Test-Command "sui") {
        Write-Host "   Building contract..." -ForegroundColor Cyan
        sui move build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "   ✅ Contract built successfully!" -ForegroundColor Green
            
            # Run tests
            Write-Host "   Running tests..." -ForegroundColor Cyan
            sui move test
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "   ✅ All tests passed!" -ForegroundColor Green
            }
        }
    }
    
    Pop-Location
} else {
    Write-Host "   ❌ Contract directory not found: $contractPath" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                     Setup Complete!                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Navigate to contract: cd $contractPath" -ForegroundColor White
Write-Host "  2. Deploy to testnet:    sui client publish --gas-budget 100000000" -ForegroundColor White
Write-Host "  3. Copy Package ID and update src/lib/constants.ts" -ForegroundColor White
Write-Host ""
Write-Host "📚 See contracts/SETUP.md for detailed instructions" -ForegroundColor Cyan
