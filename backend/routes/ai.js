/**
 * AI Routes (L402 Protected)
 * 
 * Endpoints for AI inference via L402 payment gateway
 * Supports: Oobabooga, Grok, ChatGPT, Claude
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /v1/providers
 * List available AI providers and pricing
 */
router.get('/providers', async (req, res) => {
  try {
    const aiProviders = req.app.locals.aiProviders;
    const l402Gateway = req.app.locals.l402Gateway;
    
    res.json({
      providers: aiProviders.listProviders(),
      pricing: l402Gateway.getPricing()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /v1/stats
 * Get L402 usage statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const l402Gateway = req.app.locals.l402Gateway;
    res.json(l402Gateway.getStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/chat
 * Chat completion endpoint (L402 protected)
 * 
 * Request body:
 * - provider: 'oobabooga' | 'grok' | 'chatgpt' | 'claude'
 * - messages: [{ role: 'user' | 'assistant' | 'system', content: string }]
 * - max_tokens: number (optional)
 * - temperature: number (optional)
 * - model: string (optional, provider-specific)
 * - stream: boolean (optional)
 */
router.post('/chat', async (req, res) => {
  try {
    const aiProviders = req.app.locals.aiProviders;
    const l402Gateway = req.app.locals.l402Gateway;
    
    const { provider = 'oobabooga', messages, max_tokens, temperature, model, stream } = req.body;

    // Validate provider
    if (!aiProviders.isEnabled(provider)) {
      return res.status(400).json({ 
        error: `Provider '${provider}' is not enabled`,
        available: aiProviders.listProviders().filter(p => p.enabled).map(p => p.name)
      });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    // Get L402 session info
    const l402Session = req.l402?.session;

    // Handle streaming if requested
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let totalTokens = 0;

      try {
        for await (const chunk of aiProviders.chatStream(provider, messages, { max_tokens, temperature, model })) {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.content) {
            totalTokens += aiProviders.countTokens(provider, chunk.content);
          }
        }
        
        // Record usage
        if (l402Session) {
          l402Gateway.recordUsage(l402Session.paymentHash, totalTokens, provider);
        }

        res.write(`data: ${JSON.stringify({ done: true, total_tokens: totalTokens })}\n\n`);
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
      return;
    }

    // Non-streaming response
    const response = await aiProviders.chat(provider, messages, { max_tokens, temperature, model });

    // Record usage for billing
    if (l402Session) {
      l402Gateway.recordUsage(l402Session.paymentHash, response.usage?.total_tokens || 0, provider);
    }

    res.json({
      provider: response.provider,
      model: response.model,
      content: response.content,
      usage: response.usage,
      finish_reason: response.finish_reason,
      l402: l402Session ? {
        tokens_charged: response.usage?.total_tokens || 0,
        sats_charged: (response.usage?.total_tokens || 0) * l402Gateway.pricingTiers[provider].pricePerToken
      } : null
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/completions
 * Text completion endpoint (legacy format)
 */
router.post('/completions', async (req, res) => {
  try {
    const { provider = 'oobabooga', prompt, max_tokens, temperature, model } = req.body;
    
    // Convert to chat format
    const messages = [{ role: 'user', content: prompt }];
    
    // Forward to chat endpoint
    req.body.messages = messages;
    delete req.body.prompt;
    
    // Reuse chat handler logic
    const aiProviders = req.app.locals.aiProviders;
    const l402Gateway = req.app.locals.l402Gateway;

    if (!aiProviders.isEnabled(provider)) {
      return res.status(400).json({ error: `Provider '${provider}' is not enabled` });
    }

    const response = await aiProviders.chat(provider, messages, { max_tokens, temperature, model });
    
    const l402Session = req.l402?.session;
    if (l402Session) {
      l402Gateway.recordUsage(l402Session.paymentHash, response.usage?.total_tokens || 0, provider);
    }

    res.json({
      provider: response.provider,
      model: response.model,
      text: response.content,
      usage: response.usage
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/oobabooga/chat
 * Direct Oobabooga endpoint
 */
router.post('/oobabooga/chat', async (req, res) => {
  req.body.provider = 'oobabooga';
  return handleProviderChat(req, res);
});

/**
 * POST /v1/grok/chat
 * Direct Grok endpoint
 */
router.post('/grok/chat', async (req, res) => {
  req.body.provider = 'grok';
  return handleProviderChat(req, res);
});

/**
 * POST /v1/chatgpt/chat
 * Direct ChatGPT endpoint
 */
router.post('/chatgpt/chat', async (req, res) => {
  req.body.provider = 'chatgpt';
  return handleProviderChat(req, res);
});

/**
 * POST /v1/claude/chat
 * Direct Claude endpoint
 */
router.post('/claude/chat', async (req, res) => {
  req.body.provider = 'claude';
  return handleProviderChat(req, res);
});

/**
 * Helper function for provider-specific chat
 */
async function handleProviderChat(req, res) {
  try {
    const aiProviders = req.app.locals.aiProviders;
    const l402Gateway = req.app.locals.l402Gateway;
    
    const { provider, messages, max_tokens, temperature, model } = req.body;

    if (!aiProviders.isEnabled(provider)) {
      return res.status(400).json({ 
        error: `Provider '${provider}' is not enabled. Configure the API key in environment variables.`
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
    }

    const response = await aiProviders.chat(provider, messages, { max_tokens, temperature, model });
    
    const l402Session = req.l402?.session;
    if (l402Session) {
      l402Gateway.recordUsage(l402Session.paymentHash, response.usage?.total_tokens || 0, provider);
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /v1/prepaid/create
 * Create a prepaid token budget session
 */
router.post('/prepaid/create', async (req, res) => {
  try {
    const l402Gateway = req.app.locals.l402Gateway;
    const { provider, token_budget, expiry_hours } = req.body;

    if (!provider || !token_budget) {
      return res.status(400).json({ error: 'Provider and token_budget required' });
    }

    const session = await l402Gateway.createPrepaidSession(
      provider, 
      token_budget, 
      expiry_hours || 24
    );

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /v1/bolt12/offer
 * Create a BOLT12 offer for AI services
 */
router.post('/bolt12/offer', async (req, res) => {
  try {
    const l402Gateway = req.app.locals.l402Gateway;
    const { provider, description } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider required' });
    }

    const offer = await l402Gateway.createBOLT12Offer(provider, description);
    res.json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
