#!/usr/bin/env bash
# =============================================================================
# FB Ad Accelerator Light — Install Script
# =============================================================================
# Run this script to set up the application for the first time.
#   chmod +x install.sh && ./install.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  FB Ad Accelerator Light — Installer"
echo "=========================================="
echo ""

# ------------------------------------------------------------------
# 1. Check prerequisites
# ------------------------------------------------------------------

echo "Checking prerequisites..."

# Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js >= 20."
  echo "   https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js >= 20 is required. Current version: $(node -v)"
  exit 1
fi
echo "✓ Node.js $(node -v)"

# Enable corepack for pnpm
if command -v corepack &> /dev/null; then
  corepack enable 2>/dev/null || true
fi

# pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm via corepack..."
  corepack enable
  if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not available. Please install pnpm >= 10.4"
    echo "   Run: corepack enable"
    exit 1
  fi
fi
echo "✓ pnpm $(pnpm -v)"

echo ""

# ------------------------------------------------------------------
# 2. Install dependencies
# ------------------------------------------------------------------

echo "Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"
echo ""

# ------------------------------------------------------------------
# 3. Create .env from example if it doesn't exist
# ------------------------------------------------------------------

if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env from .env.example"
  echo "  → Edit .env to set your OPENAI_API_KEY and other settings"
else
  echo "✓ .env already exists (skipping)"
fi
echo ""

# ------------------------------------------------------------------
# 4. Create data directory and run database migrations
# ------------------------------------------------------------------

mkdir -p data
echo "Running database migrations..."
npx drizzle-kit generate
npx drizzle-kit migrate
echo "✓ Database migrated"
echo ""

# ------------------------------------------------------------------
# 5. Seed default background templates
# ------------------------------------------------------------------

echo "Seeding default templates..."
node seed-templates.mjs
echo ""

# ------------------------------------------------------------------
# 6. Create default admin user
# ------------------------------------------------------------------

echo "Creating default admin user..."
node seed-admin.mjs
echo ""

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------

echo "=========================================="
echo "  ✅ Installation complete!"
echo "=========================================="
echo ""
echo "Default login credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo ""
echo "⚠️  You will be required to change the default"
echo "   password on first login."
echo ""
echo "Start the development server:"
echo "  pnpm run dev"
echo ""
echo "Or build and start for production:"
echo "  pnpm run build && pnpm start"
echo ""
