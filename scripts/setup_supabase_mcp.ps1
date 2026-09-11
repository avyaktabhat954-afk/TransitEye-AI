# ==============================================================================
# TransitEye: Supabase MCP Server Setup Script
# ==============================================================================

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "   TransitEye: Supabase MCP Configuration & Setup      " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script configures the official Supabase MCP server for Antigravity IDE."
Write-Host "If you don't have a token yet, generate one here:"
Write-Host "  https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
Write-Host ""

# Prompt for Personal Access Token securely
$secureToken = Read-Host "Enter your Supabase Personal Access Token (PAT)" -AsSecureString
$tokenBSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($tokenBSTR)

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "[ERROR] Token cannot be empty. Setup aborted." -ForegroundColor Red
    exit 1
}

# Prompt for optional Project Reference
Write-Host ""
$projectRef = Read-Host "Enter your Supabase Project Reference ID (optional, press Enter to allow all projects)"
$projectRef = $projectRef.Trim()

Write-Host "`nSetting user-level environment variable SUPABASE_ACCESS_TOKEN..." -ForegroundColor Cyan
[System.Environment]::SetEnvironmentVariable('SUPABASE_ACCESS_TOKEN', $token, 'User')
$env:SUPABASE_ACCESS_TOKEN = $token

# Prepare arguments
$mcpArgs = @("/c", "npx", "-y", "@supabase/mcp-server-supabase@latest")
if (![string]::IsNullOrWhiteSpace($projectRef)) {
    $mcpArgs += @("--project-ref", $projectRef)
}

$configObj = @{
    mcpServers = @{
        supabase = @{
            command = "cmd.exe"
            args = $mcpArgs
            env = @{
                SUPABASE_ACCESS_TOKEN = $token
            }
        }
    }
}

$jsonContent = $configObj | ConvertTo-Json -Depth 5

# Target file paths
$globalConfigPath = "$HOME\.gemini\config\mcp_config.json"
$workspaceConfigPath = "$PSScriptRoot\..\.agents\mcp_config.json"
$pluginConfigPath = "$PSScriptRoot\..\.agents\plugins\supabase\mcp_config.json"

Write-Host "Updating MCP configuration files..." -ForegroundColor Cyan

# 1. Global config
try {
    $globalDir = Split-Path $globalConfigPath
    if (!(Test-Path $globalDir)) {
        New-Item -ItemType Directory -Path $globalDir -Force | Out-Null
    }
    Set-Content -Path $globalConfigPath -Value $jsonContent -Encoding UTF8
    Write-Host " [OK] Updated Global Config: $globalConfigPath" -ForegroundColor Green
} catch {
    Write-Host " [WARN] Could not write to global config: $_" -ForegroundColor Yellow
}

# 2. Workspace config
try {
    $wsDir = Split-Path $workspaceConfigPath
    if (!(Test-Path $wsDir)) {
        New-Item -ItemType Directory -Path $wsDir -Force | Out-Null
    }
    Set-Content -Path $workspaceConfigPath -Value $jsonContent -Encoding UTF8
    Write-Host " [OK] Updated Workspace Config: $workspaceConfigPath" -ForegroundColor Green
} catch {
    Write-Host " [WARN] Could not write to workspace config: $_" -ForegroundColor Yellow
}

# 3. Plugin config
try {
    $plugDir = Split-Path $pluginConfigPath
    if (!(Test-Path $plugDir)) {
        New-Item -ItemType Directory -Path $plugDir -Force | Out-Null
    }
    Set-Content -Path $pluginConfigPath -Value $jsonContent -Encoding UTF8
    Write-Host " [OK] Updated Plugin Config: $pluginConfigPath" -ForegroundColor Green
} catch {
    Write-Host " [WARN] Could not write to plugin config: $_" -ForegroundColor Yellow
}

# Optional: initialize or update .env in TransitEye if project ref was given
$envFile = "$PSScriptRoot\..\.env"
if (![string]::IsNullOrWhiteSpace($projectRef)) {
    $supabaseUrl = "https://$projectRef.supabase.co"
    if (Test-Path $envFile) {
        $currentEnv = Get-Content $envFile -Raw
        if ($currentEnv -match "SUPABASE_URL=") {
            $currentEnv = $currentEnv -replace "SUPABASE_URL=.*", "SUPABASE_URL=$supabaseUrl"
            Set-Content -Path $envFile -Value $currentEnv
            Write-Host " [OK] Updated SUPABASE_URL in .env" -ForegroundColor Green
        }
    } else {
        if (Test-Path "$PSScriptRoot\..\.env.example") {
            Copy-Item "$PSScriptRoot\..\.env.example" $envFile
            $currentEnv = Get-Content $envFile -Raw
            $currentEnv = $currentEnv -replace "SUPABASE_URL=.*", "SUPABASE_URL=$supabaseUrl"
            Set-Content -Path $envFile -Value $currentEnv
            Write-Host " [OK] Created .env from .env.example with SUPABASE_URL configured" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "   Supabase MCP configured successfully!              " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host "Next step:"
Write-Host "1. In Antigravity IDE, check: Additional Options (...) > MCP Servers"
Write-Host "2. Reload your IDE window (Ctrl+Shift+P -> Developer: Reload Window) if needed."
Write-Host ""
