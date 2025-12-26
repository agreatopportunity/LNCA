/**
 * Channel Routes
 * 
 * Endpoints for Lightning channel management
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/channels
 * List all channels
 */
router.get('/', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const channels = await lnd.listChannels();
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/channels/summary
 * Get channel summary statistics
 */
router.get('/summary', async (req, res) => {
  try {
    const lnd = req.app.locals.lnd;
    const { channels } = await lnd.listChannels();
    
    const summary = {
      total: channels.length,
      active: channels.filter(c => c.active).length,
      inactive: channels.filter(c => !c.active).length,
      totalCapacity: channels.reduce((sum, c) => sum + parseInt(c.capacity), 0),
      totalLocal: channels.reduce((sum, c) => sum + parseInt(c.local_balance), 0),
      totalRemote: channels.reduce((sum, c) => sum + parseInt(c.remote_balance), 0),
      channels: channels.map(c => ({
        chanId: c.chan_id,
        active: c.active,
        remotePubkey: c.remote_pubkey,
        capacity: parseInt(c.capacity),
        localBalance: parseInt(c.local_balance),
        remoteBalance: parseInt(c.remote_balance),
        private: c.private
      }))
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
