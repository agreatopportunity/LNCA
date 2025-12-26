/**
 * L402 Client Library
 * 
 * Simple client for interacting with L402-protected APIs
 * Handles payment flow automatically
 */

class L402Client {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.paymentCallback = options.paymentCallback; // Function to pay invoices
    this.tokens = new Map(); // Cache L402 tokens
  }

  /**
   * Make an L402-protected request
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Check for cached token
    const cachedToken = this.tokens.get(endpoint);
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      options.headers = {
        ...options.headers,
        'Authorization': `L402 ${cachedToken.macaroon}:${cachedToken.preimage}`
      };
    }

    // Make initial request
    let response = await fetch(url, options);

    // Handle 402 Payment Required
    if (response.status === 402) {
      const challenge = await response.json();
      console.log('Payment required:', challenge.amount_sats, 'sats');

      // Pay the invoice
      if (!this.paymentCallback) {
        throw new Error('No payment callback configured');
      }

      const preimage = await this.paymentCallback(challenge.invoice, challenge.amount_sats);
      
      if (!preimage) {
        throw new Error('Payment failed');
      }

      // Cache the token
      this.tokens.set(endpoint, {
        macaroon: challenge.macaroon,
        preimage: preimage,
        expiresAt: challenge.expires_at || (Date.now() + 600000)
      });

      // Retry with L402 token
      options.headers = {
        ...options.headers,
        'Authorization': `L402 ${challenge.macaroon}:${preimage}`
      };

      response = await fetch(url, options);
    }

    return response.json();
  }

  /**
   * Chat with an AI provider
   */
  async chat(provider, messages, options = {}) {
    return this.request('/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        messages,
        ...options
      })
    });
  }

  /**
   * Get available providers
   */
  async getProviders() {
    const response = await fetch(`${this.baseUrl}/v1/providers`);
    return response.json();
  }

  /**
   * Get L402 stats
   */
  async getStats() {
    const response = await fetch(`${this.baseUrl}/v1/stats`);
    return response.json();
  }
}

// Example usage with mock payment
async function demo() {
  const client = new L402Client('http://localhost:3000', {
    // Mock payment callback - in production, connect to your LN wallet
    paymentCallback: async (invoice, amount) => {
      console.log(`Paying invoice: ${invoice.slice(0, 30)}... (${amount} sats)`);
      // Return mock preimage
      return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    }
  });

  try {
    // Get providers
    console.log('\n📋 Available Providers:');
    const providers = await client.getProviders();
    console.log(providers);

    // Chat with Oobabooga
    console.log('\n🤖 Chatting with Oobabooga:');
    const response = await client.chat('oobabooga', [
      { role: 'user', content: 'What is Bitcoin?' }
    ]);
    console.log(response);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export for module use
export { L402Client };

// Run demo if executed directly
if (typeof window === 'undefined' && process.argv[1].includes('l402-client')) {
  demo();
}
