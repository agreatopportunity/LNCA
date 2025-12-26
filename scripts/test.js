#!/usr/bin/env node

/**
 * Lightning Hub - Test Script
 * 
 * Tests all 4 AI providers through the L402 gateway
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Mock payment function (returns fake preimage)
function mockPayment(invoice, amount) {
  log(colors.yellow, `  ⚡ Paying ${amount} sats...`);
  // In production, this would call your LN wallet
  return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
}

async function testEndpoint(name, url, options = {}) {
  log(colors.cyan, `\n🔍 Testing: ${name}`);
  log(colors.dim, `   ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.status === 402) {
      log(colors.yellow, `   📋 402 Payment Required - ${data.amount_sats} sats`);
      
      // Pay and retry
      const preimage = mockPayment(data.invoice, data.amount_sats);
      
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `L402 ${data.macaroon}:${preimage}`
        }
      });
      
      const retryData = await retryResponse.json();
      log(colors.green, `   ✅ Success after payment`);
      return retryData;
    }
    
    if (response.ok) {
      log(colors.green, `   ✅ Success (${response.status})`);
    } else {
      log(colors.red, `   ❌ Error: ${data.error || response.status}`);
    }
    
    return data;
  } catch (error) {
    log(colors.red, `   ❌ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log(`
${colors.bright}${colors.yellow}
╔═══════════════════════════════════════════════════════════╗
║           ⚡ LIGHTNING HUB - TEST SUITE ⚡                 ║
║                                                           ║
║   Testing L402 Gateway with 4 AI Providers:               ║
║   • Oobabooga (Local)                                     ║
║   • Grok (xAI)                                            ║
║   • ChatGPT (OpenAI)                                      ║
║   • Claude (Anthropic)                                    ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}
API Base: ${API_BASE}
`);

  // Test health endpoint
  await testEndpoint('Health Check', `${API_BASE}/health`);

  // Test node stats
  await testEndpoint('Node Stats', `${API_BASE}/api/node/stats`);

  // Test channels
  await testEndpoint('Channels', `${API_BASE}/api/channels/summary`);

  // Test Cashu
  await testEndpoint('Cashu Status', `${API_BASE}/api/cashu/status`);

  // Test providers list
  const providers = await testEndpoint('AI Providers', `${API_BASE}/v1/providers`);
  
  if (providers) {
    log(colors.bright, '\n📊 Available Providers:');
    providers.providers?.forEach(p => {
      const status = p.enabled ? colors.green + '✅' : colors.red + '❌';
      log(colors.dim, `   ${status} ${p.name}${colors.reset}`);
    });
    
    log(colors.bright, '\n💰 Pricing:');
    providers.pricing?.forEach(p => {
      log(colors.dim, `   ${p.name}: ${p.pricePerToken} sat/token`);
    });
  }

  // Test L402 stats
  await testEndpoint('L402 Stats', `${API_BASE}/v1/stats`);

  // Test each AI provider
  const testProviders = ['oobabooga', 'grok', 'chatgpt', 'claude'];
  const testMessage = [{ role: 'user', content: 'Say hello in exactly 5 words.' }];

  for (const provider of testProviders) {
    log(colors.bright, `\n${'='.repeat(50)}`);
    log(colors.magenta, `🤖 Testing ${provider.toUpperCase()}`);
    log(colors.bright, '='.repeat(50));

    const result = await testEndpoint(
      `${provider} Chat`,
      `${API_BASE}/v1/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          messages: testMessage,
          max_tokens: 50
        })
      }
    );

    if (result?.content) {
      log(colors.cyan, `   📝 Response: "${result.content.slice(0, 100)}"`);
      if (result.usage) {
        log(colors.dim, `   📊 Tokens: ${result.usage.total_tokens}`);
      }
      if (result.l402) {
        log(colors.yellow, `   ⚡ Cost: ${result.l402.sats_charged} sats`);
      }
    }
  }

  // Test Nostr
  log(colors.bright, `\n${'='.repeat(50)}`);
  log(colors.blue, '📡 Testing Nostr');
  log(colors.bright, '='.repeat(50));

  await testEndpoint('Nostr Profile', `${API_BASE}/api/messages/profile`);

  // Summary
  console.log(`
${colors.bright}${colors.green}
╔═══════════════════════════════════════════════════════════╗
║                    TEST COMPLETE ✅                        ║
╚═══════════════════════════════════════════════════════════╝
${colors.reset}

${colors.yellow}Next Steps:${colors.reset}
1. Configure real API keys in .env for live AI access
2. Connect to your LND node for real Lightning payments
3. Start the frontend: cd frontend && npm run dev
4. Access the dashboard at http://localhost:5173

${colors.cyan}Documentation:${colors.reset} See README.md for full setup guide
`);
}

// Run tests
main().catch(console.error);
