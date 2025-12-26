/**
 * Messages Routes
 * 
 * Endpoints for Nostr-based messaging
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/messages/profile
 * Get our Nostr profile
 */
router.get('/profile', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    
    res.json({
      pubkey: nostr.publicKey,
      npub: nostr.getNpub(),
      relays: nostr.getRelayStatus()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/note
 * Publish a text note
 */
router.post('/note', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const { content, tags } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    const result = await nostr.publishNote(content, tags || []);
    res.json({
      event: result.event,
      published: result.results.filter(r => r.sent).length,
      relays: result.results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/dm
 * Send an encrypted direct message
 */
router.post('/dm', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const { recipient, content } = req.body;

    if (!recipient || !content) {
      return res.status(400).json({ error: 'Recipient and content required' });
    }

    const result = await nostr.sendDM(recipient, content);
    res.json({
      event: result.event,
      published: result.results.filter(r => r.sent).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/channel
 * Send a message to a channel
 */
router.post('/channel', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const { channelId, content, replyTo } = req.body;

    if (!channelId || !content) {
      return res.status(400).json({ error: 'Channel ID and content required' });
    }

    const result = await nostr.sendChannelMessage(channelId, content, replyTo);
    res.json({
      event: result.event,
      published: result.results.filter(r => r.sent).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/zap/request
 * Create a zap request for Lightning payment
 */
router.post('/zap/request', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const lnd = req.app.locals.lnd;
    const { recipient, amount, eventId, comment } = req.body;

    if (!recipient || !amount) {
      return res.status(400).json({ error: 'Recipient and amount required' });
    }

    // Create zap request event
    const zapRequest = nostr.createZapRequest(recipient, amount, eventId, comment || '');

    // Create Lightning invoice for the zap
    const invoice = await lnd.createInvoice(
      amount,
      `Zap for ${recipient.slice(0, 8)}...`,
      600
    );

    res.json({
      zapRequest,
      invoice: invoice.payment_request,
      paymentHash: invoice.r_hash
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/subscribe
 * Subscribe to messages (returns subscription ID)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const io = req.app.locals.io;
    const { filters, socketId } = req.body;

    // Subscribe and forward to WebSocket
    const subscriptionId = nostr.subscribe(filters || [], (event) => {
      io.to(socketId).emit('nostr:event', event);
    });

    res.json({ subscriptionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/unsubscribe
 * Unsubscribe from messages
 */
router.post('/unsubscribe', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID required' });
    }

    nostr.unsubscribe(subscriptionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/channel/create
 * Create a new channel
 */
router.post('/channel/create', async (req, res) => {
  try {
    const nostr = req.app.locals.nostr;
    const { name, about, picture } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Channel name required' });
    }

    const result = await nostr.createChannel(name, about || '', picture || '');
    res.json({
      channelId: result.event.id,
      event: result.event
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
