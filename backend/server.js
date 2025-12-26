/**
 * Lightning Messaging Hub - Backend Server
 * 
 * Connects to LND, provides REST API for frontend,
 * handles Nostr integration, and manages L402 sessions
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';

// Import our modules
import { LNDClient } from './services/lnd.js';
import { NostrService } from './services/nostr.js';
import { CashuService } from './services/cashu.js';
import { L402Gateway } from './services/l402-gateway.js';
import { AIProviderRouter } from './services/ai-providers.js';

// Routes
import nodeRoutes from './routes/node.js';
import invoiceRoutes from './routes/invoices.js';
import channelRoutes from './routes/channels.js';
import messageRoutes from './routes/messages.js';
import cashuRoutes from './routes/cashu.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const lnd = new LNDClient({
  socket: process.env.LND_SOCKET || 'localhost:10009',
  macaroonPath: process.env.LND_MACAROON_PATH || '~/.lnd/data/chain/bitcoin/mainnet/admin.macaroon',
  tlsCertPath: process.env.LND_TLS_CERT_PATH || '~/.lnd/tls.cert'
});

const nostr = new NostrService({
  privateKey: process.env.NOSTR_PRIVATE_KEY,
  relays: (process.env.NOSTR_RELAYS || 'wss://relay.damus.io,wss://nos.lol').split(',')
});

const cashu = new CashuService({
  mintUrl: process.env.CASHU_MINT_URL || 'http://localhost:3338'
});

const l402Gateway = new L402Gateway({
  lnd,
  pricingTiers: {
    'oobabooga': { pricePerToken: 1, name: 'Oobabooga (Local)' },
    'grok': { pricePerToken: 5, name: 'Grok (xAI)' },
    'chatgpt': { pricePerToken: 3, name: 'ChatGPT (OpenAI)' },
    'claude': { pricePerToken: 4, name: 'Claude (Anthropic)' }
  }
});

const aiProviders = new AIProviderRouter({
  oobabooga: {
    baseUrl: process.env.OOBABOOGA_URL || 'http://localhost:5000',
    enabled: process.env.ENABLE_OOBABOOGA === 'true'
  },
  grok: {
    apiKey: process.env.GROK_API_KEY,
    enabled: !!process.env.GROK_API_KEY
  },
  chatgpt: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabled: !!process.env.ANTHROPIC_API_KEY
  }
});

// Attach services to app for route access
app.locals.lnd = lnd;
app.locals.nostr = nostr;
app.locals.cashu = cashu;
app.locals.l402Gateway = l402Gateway;
app.locals.aiProviders = aiProviders;
app.locals.io = io;

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    services: {
      lnd: lnd.isConnected(),
      nostr: nostr.isConnected(),
      cashu: cashu.isConnected()
    }
  });
});

// API Routes
app.use('/api/node', nodeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/cashu', cashuRoutes);

// L402-protected AI routes
app.use('/v1', l402Gateway.middleware(), aiRoutes);

// WebSocket handling for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Subscribe to invoice updates
  socket.on('subscribe:invoices', async () => {
    lnd.subscribeInvoices((invoice) => {
      socket.emit('invoice:update', invoice);
    });
  });

  // Subscribe to Nostr messages
  socket.on('subscribe:messages', async () => {
    nostr.subscribeToMentions((event) => {
      socket.emit('message:received', event);
    });
  });

  // Subscribe to payment updates
  socket.on('subscribe:payments', async () => {
    lnd.subscribePayments((payment) => {
      socket.emit('payment:update', payment);
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'UNKNOWN_ERROR'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize connections
    await lnd.connect();
    console.log('✅ Connected to LND');

    await nostr.connect();
    console.log('✅ Connected to Nostr relays');

    await cashu.connect();
    console.log('✅ Connected to Cashu mint');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║           ⚡ LIGHTNING MESSAGING HUB ⚡                    ║
╠═══════════════════════════════════════════════════════════╣
║  Server running on port ${PORT}                              ║
║                                                           ║
║  Endpoints:                                               ║
║  • API:      http://localhost:${PORT}/api                    ║
║  • L402 AI:  http://localhost:${PORT}/v1/chat                ║
║  • WebSocket: ws://localhost:${PORT}                         ║
║                                                           ║
║  AI Providers:                                            ║
║  • Oobabooga: ${aiProviders.isEnabled('oobabooga') ? '✅ Enabled' : '❌ Disabled'}                           ║
║  • Grok:      ${aiProviders.isEnabled('grok') ? '✅ Enabled' : '❌ Disabled'}                           ║
║  • ChatGPT:   ${aiProviders.isEnabled('chatgpt') ? '✅ Enabled' : '❌ Disabled'}                           ║
║  • Claude:    ${aiProviders.isEnabled('claude') ? '✅ Enabled' : '❌ Disabled'}                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, io, lnd, nostr, cashu, l402Gateway, aiProviders };
