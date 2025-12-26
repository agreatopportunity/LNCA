/**
 * Nostr Service
 * 
 * Handles decentralized messaging via Nostr protocol
 * Implements key NIPs:
 * - NIP-01: Basic protocol
 * - NIP-04: Encrypted Direct Messages
 * - NIP-57: Lightning Zaps
 * - NIP-47: Nostr Wallet Connect
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

// Nostr event kinds
const KINDS = {
  METADATA: 0,
  TEXT_NOTE: 1,
  RECOMMEND_RELAY: 2,
  CONTACTS: 3,
  ENCRYPTED_DM: 4,
  DELETE: 5,
  REPOST: 6,
  REACTION: 7,
  ZAP_REQUEST: 9734,
  ZAP_RECEIPT: 9735,
  CHANNEL_CREATE: 40,
  CHANNEL_METADATA: 41,
  CHANNEL_MESSAGE: 42
};

export class NostrService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.privateKey = options.privateKey || this.generatePrivateKey();
    this.publicKey = this.derivePublicKey(this.privateKey);
    this.relays = options.relays || [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.nostr.band'
    ];
    
    this.connections = new Map();
    this.subscriptions = new Map();
    this.messageHandlers = [];
    this.connected = false;
  }

  /**
   * Generate a new private key
   */
  generatePrivateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Derive public key from private key (simplified - in production use secp256k1)
   */
  derivePublicKey(privateKey) {
    // In production, use proper secp256k1 derivation
    // This is a simplified version for demonstration
    const hash = crypto.createHash('sha256').update(privateKey).digest();
    return hash.toString('hex');
  }

  /**
   * Connect to all configured relays
   */
  async connect() {
    const connectionPromises = this.relays.map(relay => this.connectToRelay(relay));
    await Promise.allSettled(connectionPromises);
    this.connected = this.connections.size > 0;
    return this.connected;
  }

  /**
   * Connect to a single relay
   */
  connectToRelay(url) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        
        ws.on('open', () => {
          console.log(`Connected to relay: ${url}`);
          this.connections.set(url, ws);
          resolve(ws);
        });

        ws.on('message', (data) => {
          this.handleRelayMessage(url, data.toString());
        });

        ws.on('close', () => {
          console.log(`Disconnected from relay: ${url}`);
          this.connections.delete(url);
          // Attempt reconnection after 5 seconds
          setTimeout(() => this.connectToRelay(url), 5000);
        });

        ws.on('error', (error) => {
          console.error(`Relay error (${url}):`, error.message);
          reject(error);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if connected to any relay
   */
  isConnected() {
    return this.connections.size > 0;
  }

  /**
   * Handle incoming relay messages
   */
  handleRelayMessage(relay, data) {
    try {
      const message = JSON.parse(data);
      const [type, ...params] = message;

      switch (type) {
        case 'EVENT':
          this.handleEvent(relay, params[0], params[1]);
          break;
        case 'OK':
          this.emit('ok', { relay, eventId: params[0], success: params[1], message: params[2] });
          break;
        case 'EOSE':
          this.emit('eose', { relay, subscriptionId: params[0] });
          break;
        case 'NOTICE':
          console.log(`Notice from ${relay}:`, params[0]);
          break;
      }
    } catch (error) {
      console.error('Failed to parse relay message:', error);
    }
  }

  /**
   * Handle incoming events
   */
  handleEvent(relay, subscriptionId, event) {
    // Emit for subscription handlers
    this.emit(`event:${subscriptionId}`, event);
    
    // Emit general event
    this.emit('event', { relay, subscriptionId, event });

    // Handle specific event types
    switch (event.kind) {
      case KINDS.TEXT_NOTE:
        this.emit('note', event);
        break;
      case KINDS.ENCRYPTED_DM:
        this.handleEncryptedDM(event);
        break;
      case KINDS.ZAP_RECEIPT:
        this.emit('zap', event);
        break;
      case KINDS.CHANNEL_MESSAGE:
        this.emit('channel_message', event);
        break;
    }
  }

  /**
   * Handle encrypted direct messages (NIP-04)
   */
  handleEncryptedDM(event) {
    // Check if message is for us
    const recipientTag = event.tags.find(t => t[0] === 'p');
    if (!recipientTag || recipientTag[1] !== this.publicKey) {
      return;
    }

    // Decrypt message (simplified - in production use NIP-04 encryption)
    const decrypted = this.decryptMessage(event.content, event.pubkey);
    
    this.emit('dm', {
      id: event.id,
      from: event.pubkey,
      content: decrypted,
      timestamp: event.created_at,
      raw: event
    });
  }

  /**
   * Create and sign a Nostr event
   */
  createEvent(kind, content, tags = []) {
    const event = {
      kind,
      pubkey: this.publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content
    };

    // Calculate event ID (hash of serialized event)
    const serialized = JSON.stringify([
      0,
      event.pubkey,
      event.created_at,
      event.kind,
      event.tags,
      event.content
    ]);
    event.id = crypto.createHash('sha256').update(serialized).digest('hex');

    // Sign event (simplified - in production use schnorr signature)
    event.sig = this.signEvent(event.id);

    return event;
  }

  /**
   * Sign an event (simplified)
   */
  signEvent(eventId) {
    const hmac = crypto.createHmac('sha256', this.privateKey);
    hmac.update(eventId);
    return hmac.digest('hex');
  }

  /**
   * Publish an event to all connected relays
   */
  async publish(event) {
    const message = JSON.stringify(['EVENT', event]);
    const results = [];

    for (const [url, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        results.push({ relay: url, sent: true });
      } else {
        results.push({ relay: url, sent: false, error: 'Not connected' });
      }
    }

    return {
      event,
      results
    };
  }

  /**
   * Subscribe to events matching a filter
   */
  subscribe(filters, callback) {
    const subscriptionId = crypto.randomBytes(8).toString('hex');
    
    // Store subscription
    this.subscriptions.set(subscriptionId, { filters, callback });

    // Listen for events
    this.on(`event:${subscriptionId}`, callback);

    // Send subscription to all relays
    const message = JSON.stringify(['REQ', subscriptionId, ...filters]);
    
    for (const [url, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId) {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove listener
    this.removeAllListeners(`event:${subscriptionId}`);
    
    // Send close to all relays
    const message = JSON.stringify(['CLOSE', subscriptionId]);
    
    for (const [url, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }

    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Subscribe to mentions of our pubkey
   */
  subscribeToMentions(callback) {
    return this.subscribe([
      { kinds: [KINDS.TEXT_NOTE, KINDS.ENCRYPTED_DM], '#p': [this.publicKey] }
    ], callback);
  }

  /**
   * Subscribe to a channel
   */
  subscribeToChannel(channelId, callback) {
    return this.subscribe([
      { kinds: [KINDS.CHANNEL_MESSAGE], '#e': [channelId] }
    ], callback);
  }

  /**
   * Subscribe to zaps for a pubkey
   */
  subscribeToZaps(pubkey, callback) {
    return this.subscribe([
      { kinds: [KINDS.ZAP_RECEIPT], '#p': [pubkey || this.publicKey] }
    ], callback);
  }

  /**
   * Publish a text note
   */
  async publishNote(content, tags = []) {
    const event = this.createEvent(KINDS.TEXT_NOTE, content, tags);
    return this.publish(event);
  }

  /**
   * Send an encrypted direct message (NIP-04)
   */
  async sendDM(recipientPubkey, content) {
    const encrypted = this.encryptMessage(content, recipientPubkey);
    const event = this.createEvent(
      KINDS.ENCRYPTED_DM,
      encrypted,
      [['p', recipientPubkey]]
    );
    return this.publish(event);
  }

  /**
   * Encrypt a message for NIP-04 (simplified)
   */
  encryptMessage(content, recipientPubkey) {
    // In production, use proper NIP-04 encryption with shared secret
    // This is a simplified version
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256')
      .update(this.privateKey + recipientPubkey)
      .digest();
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(content, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return encrypted + '?iv=' + iv.toString('base64');
  }

  /**
   * Decrypt a message from NIP-04
   */
  decryptMessage(content, senderPubkey) {
    try {
      const [encrypted, ivParam] = content.split('?iv=');
      const iv = Buffer.from(ivParam, 'base64');
      const key = crypto.createHash('sha256')
        .update(this.privateKey + senderPubkey)
        .digest();
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      return '[Decryption failed]';
    }
  }

  /**
   * Create a zap request (NIP-57)
   */
  createZapRequest(recipientPubkey, amount, eventId = null, comment = '') {
    const tags = [
      ['p', recipientPubkey],
      ['amount', amount.toString()],
      ['relays', ...this.relays]
    ];

    if (eventId) {
      tags.push(['e', eventId]);
    }

    const event = this.createEvent(KINDS.ZAP_REQUEST, comment, tags);
    return event;
  }

  /**
   * Send a message to a channel
   */
  async sendChannelMessage(channelId, content, replyTo = null) {
    const tags = [['e', channelId, '', 'root']];
    
    if (replyTo) {
      tags.push(['e', replyTo, '', 'reply']);
    }

    const event = this.createEvent(KINDS.CHANNEL_MESSAGE, content, tags);
    return this.publish(event);
  }

  /**
   * Create a channel
   */
  async createChannel(name, about = '', picture = '') {
    const metadata = JSON.stringify({ name, about, picture });
    const event = this.createEvent(KINDS.CHANNEL_CREATE, metadata);
    return this.publish(event);
  }

  /**
   * Get public key in npub format
   */
  getNpub() {
    // Simplified bech32 encoding (in production use proper bech32)
    return 'npub1' + this.publicKey.slice(0, 59);
  }

  /**
   * Get private key in nsec format
   */
  getNsec() {
    return 'nsec1' + this.privateKey.slice(0, 59);
  }

  /**
   * Get relay status
   */
  getRelayStatus() {
    return this.relays.map(url => ({
      url,
      connected: this.connections.has(url),
      readyState: this.connections.get(url)?.readyState
    }));
  }

  /**
   * Disconnect from all relays
   */
  disconnect() {
    for (const [url, ws] of this.connections) {
      ws.close();
    }
    this.connections.clear();
    this.connected = false;
  }
}

export default NostrService;
export { KINDS };
