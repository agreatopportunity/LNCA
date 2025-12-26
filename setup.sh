#!/bin/bash

# ⚡ Lightning Messaging Hub - Quick Start Script
# This script sets up the development environment

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           ⚡ LIGHTNING MESSAGING HUB SETUP ⚡              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v) detected"

# Setup Backend
echo ""
echo "📦 Setting up backend..."
cd backend

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env from template"
    echo "⚠️  Please edit backend/.env with your configuration"
else
    echo "✅ .env already exists"
fi

echo "📥 Installing backend dependencies..."
npm install

# Setup Frontend
echo ""
echo "📦 Setting up frontend..."
cd ../frontend

echo "📥 Installing frontend dependencies..."
npm install

# Done
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    ✅ SETUP COMPLETE!                      ║"
echo "╠═══════════════════════════════════════════════════════════╣"
echo "║                                                           ║"
echo "║  Next Steps:                                              ║"
echo "║                                                           ║"
echo "║  1. Configure backend/.env with your settings:            ║"
echo "║     - LND connection details                              ║"
echo "║     - AI provider API keys                                ║"
echo "║     - Nostr private key                                   ║"
echo "║                                                           ║"
echo "║  2. Start the backend:                                    ║"
echo "║     cd backend && npm run dev                             ║"
echo "║                                                           ║"
echo "║  3. Start the frontend (new terminal):                    ║"
echo "║     cd frontend && npm run dev                            ║"
echo "║                                                           ║"
echo "║  4. Open http://localhost:5173 in your browser            ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "⚡ Happy hacking!"
