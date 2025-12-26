/**
 * Cashu Routes
 * 
 * Endpoints for Cashu ecash operations
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/cashu/status
 * Get Cashu wallet status
 */
router.get('/status', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    res.json(cashu.getStatus());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cashu/balance
 * Get ecash balance
 */
router.get('/balance', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    res.json({ 
      balance: cashu.getBalance(),
      unit: 'sat'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/mint/quote
 * Request a mint quote (Lightning → Ecash)
 */
router.post('/mint/quote', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const quote = await cashu.requestMintQuote(amount);
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/mint
 * Mint tokens after payment
 */
router.post('/mint', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { quote, amount } = req.body;

    if (!quote || !amount) {
      return res.status(400).json({ error: 'Quote and amount required' });
    }

    const result = await cashu.mintTokens(quote, amount);
    res.json({
      amount: result.amount,
      balance: cashu.getBalance()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/melt/quote
 * Request a melt quote (Ecash → Lightning)
 */
router.post('/melt/quote', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { invoice } = req.body;

    if (!invoice) {
      return res.status(400).json({ error: 'Invoice required' });
    }

    const quote = await cashu.requestMeltQuote(invoice);
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/melt
 * Melt tokens to pay Lightning invoice
 */
router.post('/melt', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { quote, amount, invoice } = req.body;

    if (!quote || !amount) {
      return res.status(400).json({ error: 'Quote and amount required' });
    }

    const result = await cashu.meltTokens(quote, amount, invoice);
    res.json({
      paid: result.state === 'PAID',
      balance: cashu.getBalance()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/send
 * Create a token to send to someone
 */
router.post('/send', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    if (amount > cashu.getBalance()) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const token = await cashu.send(amount);
    res.json({
      token,
      amount,
      balance: cashu.getBalance()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cashu/receive
 * Receive a token from someone
 */
router.post('/receive', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const result = await cashu.receive(token);
    res.json({
      amount: result.amount,
      balance: cashu.getBalance()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cashu/proofs
 * Get all proofs (tokens)
 */
router.get('/proofs', async (req, res) => {
  try {
    const cashu = req.app.locals.cashu;
    const proofs = cashu.getProofs();
    
    res.json({
      count: proofs.length,
      total: proofs.reduce((sum, p) => sum + p.amount, 0),
      proofs: proofs.map(p => ({
        amount: p.amount,
        id: p.id
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
