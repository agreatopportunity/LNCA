#!/bin/bash

# Lightning Hub - Quick Start Script
# Sets up and runs the Lightning Messaging Hub

set -e

echo "
╔═══════════════════════════════════════════════════════════╗
║           ⚡ LIGHTNING HUB - QUICK START ⚡                ║
╚═══════════════════════════════════════════════════════════╝
"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Navigate to backend
cd "$(dirname "$0")/../backend"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Check for .env
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env with your configuration:"
    echo "   - LND connection details"
    echo "   - AI provider API keys (at least one)"
    echo "   - Nostr private key"
    echo ""
    echo "   vim .env"
    echo ""
fi

# Start server
echo ""
echo "🚀 Starting Lightning Hub..."
echo ""
echo "   API:       http://localhost:3000"
echo "   Health:    http://localhost:3000/health"
echo "   L402 AI:   http://localhost:3000/v1/chat"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

npm run dev
