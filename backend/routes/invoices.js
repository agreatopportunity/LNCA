/**
 * Invoice Routes
 * 
 * Endpoints for creating and managing Lightning invoices
 */

import { Router } from 'express';

const router = Router();

/**
 * POST /api/invoices/create
 * Create a new Lightning invoice
 */
router.post('/create', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { amount, memo, expiry } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const invoice = await lnd.createInvoice(amount, memo || '', expiry || 3600);
    
    res.json({
      payment_request: invoice.payment_request,
      r_hash: invoice.r_hash,
      add_index: invoice.add_index,
      expires_at: Date.now() + (expiry || 3600) * 1000
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/pay
 * Pay a Lightning invoice
 */
router.post('/pay', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { payment_request, max_fee } = req.body;

    if (!payment_request) {
      return res.status(400).json({ error: 'Payment request required' });
    }

    const result = await lnd.payInvoice(payment_request, max_fee || 100);
    
    if (result.payment_error) {
      return res.status(400).json({ error: result.payment_error });
    }

    res.json({
      preimage: result.payment_preimage,
      payment_hash: result.payment_hash,
      fee: result.payment_route?.total_fees || '0'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/decode
 * Decode a payment request
 */
router.post('/decode', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { payment_request } = req.body;

    if (!payment_request) {
      return res.status(400).json({ error: 'Payment request required' });
    }

    const decoded = await lnd.decodeInvoice(payment_request);
    res.json(decoded);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invoices/keysend
 * Send a keysend payment (for messaging)
 */
router.post('/keysend', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { dest_pubkey, amount, message } = req.body;

    if (!dest_pubkey || !amount) {
      return res.status(400).json({ error: 'Destination pubkey and amount required' });
    }

    // TLV type 34349334 is commonly used for messaging
    const tlvData = message ? {
      '34349334': Buffer.from(message).toString('hex')
    } : {};

    const result = await lnd.sendKeysend(dest_pubkey, amount, tlvData);
    
    res.json({
      preimage: result.payment_preimage,
      payment_hash: result.payment_hash,
      fee: result.payment_route?.total_fees || '0'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invoices/bolt12/offer
 * Create a BOLT12 offer
 */
router.post('/bolt12/offer', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { description, amount } = req.body;

    const offer = await lnd.createOffer(description || 'Lightning Hub', amount || 'any');
    res.json(offer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
