# ⚡ Lightning Messaging Hub

A full-stack Lightning Network application combining **L402 AI payments**, **Nostr messaging**, **Cashu ecash privacy**, and support for multiple AI providers including **Oobabooga**, **Grok**, **ChatGPT**, and **Claude**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    ⚡ LIGHTNING MESSAGING HUB                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   💬 Nostr Chat ──► 🔒 Cashu Privacy ──► ⚡ LND Node            │
│                                              │                  │
│                                              ▼                  │
│                                    🤖 L402 AI Gateway           │
│                                              │                  │
│                    ┌─────────────────────────┼─────────────────┐│
│                    │           │             │           │     ││
│                    ▼           ▼             ▼           ▼     ││
│                 Oobabooga    Grok      ChatGPT      Claude     ││
│                 (Local)     (xAI)     (OpenAI)   (Anthropic)   ││
│                    │           │             │           │     ││
│                    └───────────┴─────────────┴───────────┘     ││
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🌟 Features

### Lightning Network
- **LND Integration** - Full gRPC/REST connection to your Lightning node
- **Invoice Management** - Create, pay, and decode Lightning invoices
- **Channel Management** - View and manage channel balances
- **Keysend Payments** - Send payments with embedded message data

### L402 AI Gateway
- **Pay-per-Request** - Only pay for what you use via Lightning
- **Multi-Provider** - Switch between 4 AI providers:
  - 🖥️ **Oobabooga** (Local) - 1 sat/token - Your own models (Gemini-Mini!)
  - 🤖 **Grok** (xAI) - 5 sats/token - Real-time knowledge
  - 💚 **ChatGPT** (OpenAI) - 3 sats/token - GPT-4o, O1
  - 🧡 **Claude** (Anthropic) - 4 sats/token - Claude Sonnet/Opus
- **Macaroon Auth** - Cryptographic payment verification
- **Streaming Support** - Real-time token streaming

### Nostr Messaging
- **Decentralized Chat** - Messages via Nostr relays
- **Encrypted DMs** - NIP-04 encryption
- **Zap Integration** - Attach Lightning payments to messages
- **Channel Support** - Group chat capabilities

### Cashu Ecash
- **Privacy Layer** - Blind signatures for unlinkable payments
- **Offline Transfers** - Send tokens without internet
- **Mint/Melt** - Convert between Lightning and ecash
- **Token Management** - Send and receive Cashu tokens

---

## 📦 Installation

### Prerequisites

- **Node.js 18+** 
- **LND Node** (or Umbrel/Start9/Voltage)
- **Git**

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/agreatopportunity/LNCA.git
cd lightning-hub

# 2. Install backend dependencies
cd backend
npm install
cp .env.example .env

# 3. Configure your .env file (see Configuration section)
nano .env

# 4. Start the backend
npm run dev

# 5. In a new terminal, install and start frontend
cd ../frontend
npm install
npm run dev

# 6. Open http://localhost:5173 in your browser
```

---

## ⚙️ Configuration

Edit `backend/.env` with your settings:

### LND Connection

```bash
# Local LND
LND_SOCKET=localhost:10009
LND_MACAROON_PATH=~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
LND_TLS_CERT_PATH=~/.lnd/tls.cert

# Umbrel
LND_SOCKET=umbrel.local:10009
LND_MACAROON_PATH=/path/to/umbrel/lnd/data/chain/bitcoin/mainnet/admin.macaroon

# Voltage Cloud
LND_SOCKET=your-node.voltage.cloud:10009
```

### AI Providers

```bash
# Oobabooga (Local - text-generation-webui)
ENABLE_OOBABOOGA=true
OOBABOOGA_URL=http://localhost:5000

# Grok (xAI) - Get key at https://console.x.ai/
GROK_API_KEY=xai-xxxxxxxxxxxx

# ChatGPT (OpenAI) - Get key at https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-xxxxxxxxxxxx

# Claude (Anthropic) - Get key at https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
```

### Nostr

```bash
# Generate a new key: openssl rand -hex 32
NOSTR_PRIVATE_KEY=your-64-char-hex-key

# Relays (comma-separated)
NOSTR_RELAYS=wss://relay.damus.io,wss://nos.lol,wss://relay.nostr.band
```

### Cashu

```bash
# Your Cashu mint URL (or run your own)
CASHU_MINT_URL=http://localhost:3338
```

---

## 🖥️ Setting Up Oobabooga (Local AI)

Oobabooga lets you run your own AI models locally - perfect for your **Gemini-Mini 240M**!

### Install text-generation-webui

```bash
# Clone Oobabooga
git clone https://github.com/oobabooga/text-generation-webui.git
cd text-generation-webui

# Run the installer (picks your OS automatically)
# Linux/Mac:
./start_linux.sh

# Windows:
start_windows.bat
```

### Enable API Mode

```bash
# Start with API enabled
python server.py --api --listen

# Or add to CMD_FLAGS.txt:
--api --listen
```

### Load Your Model

1. Open http://localhost:7860
2. Go to **Model** tab
3. Download or load your model (e.g., Gemini-Mini)
4. The API will be available at http://localhost:5000

### Test the Connection

```bash
curl http://localhost:5000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 100
  }'
```

---

## 🔌 API Reference

### L402 AI Endpoints

All `/v1/*` endpoints require L402 payment. First request returns 402 with invoice.

#### Chat Completion

```bash
# Request (will return 402 first time)
curl -X POST http://localhost:3000/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "oobabooga",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Explain Bitcoin in one sentence."}
    ],
    "max_tokens": 100
  }'

# Response (402 Payment Required)
{
  "error": "Payment Required",
  "invoice": "lnbc...",
  "macaroon": "base64...",
  "amount_sats": 100
}

# After payment, include L402 header:
curl -X POST http://localhost:3000/v1/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: L402 <macaroon>:<preimage>" \
  -d '{"provider": "claude", "messages": [...]}'
```

#### Provider-Specific Endpoints

```bash
POST /v1/oobabooga/chat  # Local models
POST /v1/grok/chat       # xAI Grok
POST /v1/chatgpt/chat    # OpenAI
POST /v1/claude/chat     # Anthropic
```

### Node Endpoints

```bash
GET  /api/node/info      # Node information
GET  /api/node/stats     # Comprehensive stats
GET  /api/node/balance   # Wallet balance
```

### Invoice Endpoints

```bash
POST /api/invoices/create   # Create invoice
POST /api/invoices/pay      # Pay invoice
POST /api/invoices/decode   # Decode payment request
POST /api/invoices/keysend  # Send keysend with message
```

### Nostr Messaging

```bash
GET  /api/messages/profile  # Your Nostr profile
POST /api/messages/note     # Publish note
POST /api/messages/dm       # Send encrypted DM
POST /api/messages/zap/request  # Create zap request
```

### Cashu Ecash

```bash
GET  /api/cashu/balance     # Ecash balance
POST /api/cashu/mint/quote  # Request mint quote
POST /api/cashu/mint        # Mint tokens
POST /api/cashu/melt/quote  # Request melt quote
POST /api/cashu/melt        # Melt tokens (pay invoice)
POST /api/cashu/send        # Create sendable token
POST /api/cashu/receive     # Receive token
```

---

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Create .env file with your config
cp backend/.env.example .env
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 🔧 LND Configuration

Add these to your `lnd.conf` for full functionality:

```ini
[Application Options]
# Enable keysend for messaging
accept-keysend=true

# Enable AMP payments
accept-amp=true

# REST API (for some integrations)
restlisten=0.0.0.0:8080

[Bitcoin]
# Your Bitcoin settings...
```

Restart LND after changes:

```bash
# Umbrel
sudo systemctl restart umbrel-lnd

# Manual
lncli stop && lnd
```

---

## 🥜 Running Your Own Cashu Mint

```bash
# Install Nutshell
pip install cashu

# Configure for LND backend
export MINT_LIGHTNING_BACKEND=LndRestWallet
export MINT_LND_REST_ENDPOINT=https://localhost:8080
export MINT_LND_REST_MACAROON=$(xxd -p -c 1000 ~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon)
export MINT_LND_REST_CERT=$(base64 -w0 ~/.lnd/tls.cert)

# Start mint
cashu-mint --host 0.0.0.0 --port 3338
```

---

## 📊 L402 Pricing Tiers

| Provider   | Price/Token | Min Payment | Best For |
|------------|-------------|-------------|----------|
| Oobabooga  | 1 sat       | 10 sats     | Local inference, privacy |
| ChatGPT    | 3 sats      | 30 sats     | General tasks |
| Claude     | 4 sats      | 40 sats     | Complex reasoning |
| Grok       | 5 sats      | 50 sats     | Real-time data |

---

## 🛠️ Development

### Project Structure

```
lightning-hub/
├── backend/
│   ├── server.js           # Main Express server
│   ├── services/
│   │   ├── lnd.js          # LND client
│   │   ├── nostr.js        # Nostr service
│   │   ├── cashu.js        # Cashu service
│   │   ├── l402-gateway.js # L402 payment gateway
│   │   ├── ai-providers.js # AI provider router
│   │   └── macaroon.js     # Macaroon helpers
│   ├── routes/
│   │   ├── node.js         # Node endpoints
│   │   ├── invoices.js     # Invoice endpoints
│   │   ├── channels.js     # Channel endpoints
│   │   ├── messages.js     # Nostr endpoints
│   │   ├── cashu.js        # Cashu endpoints
│   │   └── ai.js           # L402 AI endpoints
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── LightningHub.jsx    # Main React component
│   ├── main.jsx            # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 🔒 Security Notes

- **Never commit `.env` files** - Contains API keys
- **Macaroon permissions** - Use invoice/readonly macaroon if possible
- **API keys** - Rotate regularly
- **Cashu tokens** - Treat like cash, they're bearer instruments

---

## 📚 Resources

- [L402 Protocol](https://docs.lightning.engineering/the-lightning-network/l402)
- [Nostr NIPs](https://github.com/nostr-protocol/nips)
- [Cashu Protocol](https://cashu.space)
- [LND Documentation](https://docs.lightning.engineering)
- [Oobabooga WebUI](https://github.com/oobabooga/text-generation-webui)

---

## 📜 License

MIT License

---

Built with ⚡ by Young | Branson, MO

*"When one teaches, two learn"* - KAIZEN
