/**
 * L402 Gateway Service
 * 
 * Implements the L402 protocol (formerly LSAT) for pay-per-request API access
 * Supports multiple AI providers with different pricing tiers
 * 
 * L402 Flow:
 * 1. Client requests resource → Server returns 402 with WWW-Authenticate header
 * 2. Client pays Lightning invoice → Receives preimage
 * 3. Client retries with Authorization: L402 <macaroon>:<preimage>
 * 4. Server validates and grants access
 */

import crypto from 'crypto';
import { createMacaroon, verifyMacaroon, addFirstPartyCaveat } from './macaroon.js';

export class L402Gateway {
  constructor(options = {}) {
    this.lnd = options.lnd;
    this.secretKey = options.secretKey || crypto.randomBytes(32);
    
    // Pricing tiers per provider (sats per token)
    this.pricingTiers = options.pricingTiers || {
      'oobabooga': { pricePerToken: 1, name: 'Oobabooga (Local)', minPayment: 10 },
      'grok': { pricePerToken: 5, name: 'Grok (xAI)', minPayment: 50 },
      'chatgpt': { pricePerToken: 3, name: 'ChatGPT (OpenAI)', minPayment: 30 },
      'claude': { pricePerToken: 4, name: 'Claude (Anthropic)', minPayment: 40 }
    };

    // Track active sessions (payment hash → session data)
    this.sessions = new Map();
    
    // Track usage for billing
    this.usage = new Map();
    
    // Revenue tracking
    this.revenue = {
      total: 0,
      byProvider: {}
    };

    // Initialize provider revenue
    Object.keys(this.pricingTiers).forEach(provider => {
      this.revenue.byProvider[provider] = { requests: 0, tokens: 0, sats: 0 };
    });
  }

  /**
   * Express middleware for L402 authentication
   */
  middleware() {
    return async (req, res, next) => {
      try {
        // Check for L402 authorization header
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('L402 ')) {
          // Validate existing L402 token
          const validated = await this.validateL402(authHeader);
          if (validated.valid) {
            req.l402 = validated;
            return next();
          }
        }

        // No valid L402 token - issue payment challenge
        const provider = req.query.provider || req.body?.provider || 'oobabooga';
        const estimatedTokens = req.body?.max_tokens || 1000;
        
        const challenge = await this.createChallenge(provider, estimatedTokens, req);
        
        res.status(402);
        res.set('WWW-Authenticate', `L402 macaroon="${challenge.macaroon}", invoice="${challenge.invoice}"`);
        res.json({
          error: 'Payment Required',
          code: 'L402_PAYMENT_REQUIRED',
          message: 'Please pay the Lightning invoice to access this API',
          provider: provider,
          pricing: this.pricingTiers[provider],
          invoice: challenge.invoice,
          macaroon: challenge.macaroon,
          payment_hash: challenge.paymentHash,
          amount_sats: challenge.amountSats,
          expires_at: challenge.expiresAt
        });
        
      } catch (error) {
        console.error('L402 middleware error:', error);
        res.status(500).json({ error: 'L402 authentication error' });
      }
    };
  }

  /**
   * Create L402 challenge with invoice and macaroon
   */
  async createChallenge(provider, estimatedTokens, req) {
    const tier = this.pricingTiers[provider] || this.pricingTiers['oobabooga'];
    
    // Calculate required payment
    const amountSats = Math.max(
      tier.minPayment,
      Math.ceil(estimatedTokens * tier.pricePerToken)
    );

    // Create Lightning invoice
    const memo = `L402: ${tier.name} API - ${estimatedTokens} tokens`;
    const invoice = await this.lnd.createInvoice(amountSats, memo, 600); // 10 min expiry

    // Create macaroon with caveats
    const macaroon = this.createL402Macaroon({
      paymentHash: invoice.r_hash,
      provider: provider,
      maxTokens: estimatedTokens,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    // Store session
    this.sessions.set(invoice.r_hash, {
      provider,
      maxTokens: estimatedTokens,
      amountSats,
      macaroon,
      invoice: invoice.payment_request,
      preimage: invoice.preimage, // Store for validation
      createdAt: Date.now(),
      expiresAt: Date.now() + 600000,
      paid: false,
      used: false
    });

    return {
      macaroon,
      invoice: invoice.payment_request,
      paymentHash: invoice.r_hash,
      amountSats,
      expiresAt: Date.now() + 600000
    };
  }

  /**
   * Create L402 macaroon with caveats
   */
  createL402Macaroon(data) {
    const identifier = Buffer.from(JSON.stringify({
      version: 1,
      paymentHash: data.paymentHash,
      timestamp: Date.now()
    })).toString('base64');

    // Simple macaroon creation (in production, use proper macaroon library)
    const macaroonData = {
      identifier,
      location: 'lightning-hub',
      caveats: [
        `provider = ${data.provider}`,
        `max_tokens = ${data.maxTokens}`,
        `expires = ${data.expiresAt}`
      ],
      signature: this.signMacaroon(identifier, data)
    };

    return Buffer.from(JSON.stringify(macaroonData)).toString('base64');
  }

  /**
   * Sign macaroon data
   */
  signMacaroon(identifier, data) {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(identifier);
    hmac.update(JSON.stringify(data));
    return hmac.digest('hex');
  }

  /**
   * Validate L402 authorization header
   */
  async validateL402(authHeader) {
    try {
      // Parse L402 header: "L402 <macaroon>:<preimage>"
      const token = authHeader.slice(5); // Remove "L402 "
      const [macaroonB64, preimage] = token.split(':');

      if (!macaroonB64 || !preimage) {
        return { valid: false, error: 'Invalid L402 format' };
      }

      // Decode macaroon
      const macaroon = JSON.parse(Buffer.from(macaroonB64, 'base64').toString());
      const identifier = JSON.parse(Buffer.from(macaroon.identifier, 'base64').toString());

      // Get session
      const session = this.sessions.get(identifier.paymentHash);
      if (!session) {
        return { valid: false, error: 'Session not found' };
      }

      // Check expiry
      if (Date.now() > session.expiresAt) {
        return { valid: false, error: 'Session expired' };
      }

      // Validate preimage against payment hash
      const preimageBuffer = Buffer.from(preimage, 'hex');
      const computedHash = crypto.createHash('sha256').update(preimageBuffer).digest('hex');
      
      // In mock mode, accept the stored preimage
      if (preimage !== session.preimage && computedHash !== identifier.paymentHash) {
        return { valid: false, error: 'Invalid preimage' };
      }

      // Mark as paid and valid
      session.paid = true;

      return {
        valid: true,
        session: {
          provider: session.provider,
          maxTokens: session.maxTokens,
          amountPaid: session.amountSats,
          paymentHash: identifier.paymentHash
        }
      };

    } catch (error) {
      console.error('L402 validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Record usage after successful API call
   */
  recordUsage(paymentHash, tokensUsed, provider) {
    const session = this.sessions.get(paymentHash);
    if (!session) return;

    session.used = true;
    session.tokensUsed = tokensUsed;

    // Update revenue tracking
    const tier = this.pricingTiers[provider];
    const satsCharged = tokensUsed * tier.pricePerToken;

    this.revenue.total += satsCharged;
    this.revenue.byProvider[provider].requests += 1;
    this.revenue.byProvider[provider].tokens += tokensUsed;
    this.revenue.byProvider[provider].sats += satsCharged;
  }

  /**
   * Get current pricing for all providers
   */
  getPricing() {
    return Object.entries(this.pricingTiers).map(([id, tier]) => ({
      id,
      name: tier.name,
      pricePerToken: tier.pricePerToken,
      minPayment: tier.minPayment,
      currency: 'sats'
    }));
  }

  /**
   * Get revenue statistics
   */
  getStats() {
    return {
      totalRevenue: this.revenue.total,
      byProvider: this.revenue.byProvider,
      activeSessions: this.sessions.size,
      pricing: this.getPricing()
    };
  }

  /**
   * Create a pre-paid session (for subscriptions or bulk purchases)
   */
  async createPrepaidSession(provider, tokenBudget, expiryHours = 24) {
    const tier = this.pricingTiers[provider];
    const amountSats = tokenBudget * tier.pricePerToken;
    
    const memo = `L402 Prepaid: ${tier.name} - ${tokenBudget} tokens`;
    const invoice = await this.lnd.createInvoice(amountSats, memo, expiryHours * 3600);

    const sessionId = crypto.randomBytes(16).toString('hex');
    
    this.sessions.set(sessionId, {
      type: 'prepaid',
      provider,
      tokenBudget,
      tokensRemaining: tokenBudget,
      amountSats,
      invoice: invoice.payment_request,
      paymentHash: invoice.r_hash,
      preimage: invoice.preimage,
      createdAt: Date.now(),
      expiresAt: Date.now() + (expiryHours * 3600000),
      paid: false
    });

    return {
      sessionId,
      invoice: invoice.payment_request,
      paymentHash: invoice.r_hash,
      amountSats,
      tokenBudget,
      expiresAt: Date.now() + (expiryHours * 3600000)
    };
  }

  /**
   * Use tokens from prepaid session
   */
  usePrepaidTokens(sessionId, tokensUsed) {
    const session = this.sessions.get(sessionId);
    if (!session || session.type !== 'prepaid') {
      return { success: false, error: 'Session not found' };
    }

    if (!session.paid) {
      return { success: false, error: 'Session not paid' };
    }

    if (tokensUsed > session.tokensRemaining) {
      return { success: false, error: 'Insufficient token balance', remaining: session.tokensRemaining };
    }

    session.tokensRemaining -= tokensUsed;
    
    return {
      success: true,
      tokensUsed,
      tokensRemaining: session.tokensRemaining
    };
  }

  /**
   * Generate BOLT12 offer for recurring payments
   */
  async createBOLT12Offer(provider, description) {
    const tier = this.pricingTiers[provider];
    
    // Note: BOLT12 requires CLN, this is a compatibility layer
    const offer = await this.lnd.createOffer(
      `${description || tier.name} - Pay per use`,
      'any'
    );

    return {
      offer: offer.offer,
      offerId: offer.offer_id,
      provider,
      pricing: tier
    };
  }
}

export default L402Gateway;
