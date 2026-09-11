# Supabase MCP Integration for TransitEye

This document outlines how TransitEye connects to Supabase using the Model Context Protocol (MCP) in Antigravity IDE.

## Overview

The official `@supabase/mcp-server-supabase` enables the AI assistant to directly:
- Inspect database schema, tables, views, and PostGIS geometries
- Run database migrations and execute SQL queries
- Generate TypeScript / JavaScript client types
- Inspect project configurations and deployment status

## Quick Setup (Recommended)

1. **Obtain your Supabase Personal Access Token (PAT)**:
   - Navigate to [Supabase Dashboard > Account > Access Tokens](https://supabase.com/dashboard/account/tokens)
   - Click **Generate new token**, give it a name (e.g. `TransitEye-MCP`), and copy it.

2. **(Optional) Find your Project Reference ID**:
   - In your Supabase project URL (`https://supabase.com/dashboard/project/<project-ref>`), or under **Project Settings > General > Reference ID**.

3. **Run the Setup Script in PowerShell**:
   ```powershell
   .\scripts\setup_supabase_mcp.ps1
   ```
   - Enter your token when prompted (input is hidden for security).
   - Enter your project reference ID (or press Enter for account-wide access).

4. **Verify in Antigravity IDE**:
   - Open **Additional Options (...) > MCP Servers** in the IDE.
   - Verify that `supabase` is active with connected tools.
   - If needed, reload the window (`Ctrl+Shift+P` -> `Developer: Reload Window`).

## Manual Configuration

If you prefer to configure manually, update `~/.gemini/config/mcp_config.json` (or `.agents/mcp_config.json`):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<YOUR_SUPABASE_PAT>"
      }
    }
  }
}
```

To scope to a specific project, add `--project-ref <PROJECT_ID>` to `args`.
