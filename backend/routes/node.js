/**
 * Node Routes
 * 
 * Endpoints for Lightning node information and management
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/node/info
 * Get node information
 */
router.get('/info', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const info = await lnd.getInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/node/stats
 * Get comprehensive node statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const stats = await lnd.getNodeStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/node/balance
 * Get wallet balance
 */
router.get('/balance', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const [walletBalance, channelBalance] = await Promise.all([
      lnd.getBalance(),
      lnd.getChannelBalance()
    ]);
    
    res.json({
      onchain: walletBalance,
      lightning: channelBalance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/node/forwarding
 * Get forwarding history
 */
router.get('/forwarding', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { start, end, limit } = req.query;
    
    const history = await lnd.getForwardingHistory(
      start ? parseInt(start) : Math.floor(Date.now() / 1000) - 86400,
      end ? parseInt(end) : Math.floor(Date.now() / 1000),
      limit ? parseInt(limit) : 100
    );
    
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/node/status
 * Get overall system status
 */
router.get('/status', async (req, res) => {
  try {
    const { lnd, nostr, cashu, l402Gateway } = req.app.locals;
    
    res.json({
      lnd: {
        connected: lnd.isConnected(),
        synced: true // Would check actual sync status
      },
      nostr: {
        connected: nostr.isConnected(),
        relays: nostr.getRelayStatus()
      },
      cashu: {
        connected: cashu.isConnected(),
        balance: cashu.getBalance()
      },
      l402: l402Gateway.getStats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
