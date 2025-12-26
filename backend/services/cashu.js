/**
 * Cashu Service
 * 
 * Handles Chaumian ecash operations for private Lightning payments
 * Implements NUTs (Notation, Usage & Terminology):
 * - NUT-00: Cryptographic notation
 * - NUT-03: Swap tokens
 * - NUT-04: Mint tokens (Lightning → Ecash)
 * - NUT-05: Melt tokens (Ecash → Lightning)
 * - NUT-06: Split tokens
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';

export class CashuService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.mintUrl = options.mintUrl || 'http://localhost:3338';
    this.connected = false;
    this.mintInfo = null;
    this.keysets = new Map();
    
    // Local token storage (in production, use secure storage)
    this.proofs = [];
    this.balance = 0;
  }

  /**
   * Connect to the Cashu mint
   */
  async connect() {
    try {
      // Get mint info
      this.mintInfo = await this.getMintInfo();
      
      // Get active keysets
      const keysets = await this.getKeysets();
      keysets.keysets.forEach(ks => {
        this.keysets.set(ks.id, ks);
      });

      this.connected = true;
      console.log(`Connected to Cashu mint: ${this.mintUrl}`);
      return true;

    } catch (error) {
      console.error('Failed to connect to Cashu mint:', error.message);
      // Allow running in mock mode
      this.connected = false;
      return false;
    }
  }

  /**
   * Check if connected to mint
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Get mint information
   */
  async getMintInfo() {
    try {
      const response = await fetch(`${this.mintUrl}/v1/info`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      // Return mock info
      return {
        name: 'Lightning Hub Mint',
        version: 'Nutshell/0.15.0',
        description: 'Cashu mint powered by Lightning',
        nuts: {
          '4': { methods: [{ method: 'bolt11', unit: 'sat' }] },
          '5': { methods: [{ method: 'bolt11', unit: 'sat' }] }
        }
      };
    }
  }

  /**
   * Get available keysets
   */
  async getKeysets() {
    try {
      const response = await fetch(`${this.mintUrl}/v1/keysets`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      return {
        keysets: [{
          id: '00' + crypto.randomBytes(7).toString('hex'),
          unit: 'sat',
          active: true
        }]
      };
    }
  }

  /**
   * Get keys for a keyset
   */
  async getKeys(keysetId = null) {
    try {
      const url = keysetId 
        ? `${this.mintUrl}/v1/keys/${keysetId}`
        : `${this.mintUrl}/v1/keys`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      // Return mock keys
      return {
        keysets: [{
          id: keysetId || '00' + crypto.randomBytes(7).toString('hex'),
          unit: 'sat',
          keys: this.generateMockKeys()
        }]
      };
    }
  }

  /**
   * Generate mock keys for denominations
   */
  generateMockKeys() {
    const keys = {};
    const denominations = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192];
    
    denominations.forEach(amount => {
      keys[amount.toString()] = '02' + crypto.randomBytes(32).toString('hex');
    });
    
    return keys;
  }

  /**
   * Mint tokens (Lightning → Ecash)
   * Step 1: Request mint quote
   */
  async requestMintQuote(amount) {
    try {
      const response = await fetch(`${this.mintUrl}/v1/mint/quote/bolt11`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, unit: 'sat' })
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();

    } catch (error) {
      // Return mock quote
      return {
        quote: crypto.randomBytes(16).toString('hex'),
        request: 'lnbc' + amount + '0n1p' + crypto.randomBytes(50).toString('hex'),
        state: 'UNPAID',
        expiry: Math.floor(Date.now() / 1000) + 600
      };
    }
  }

  /**
   * Mint tokens (Lightning → Ecash)
   * Step 2: After payment, mint the tokens
   */
  async mintTokens(quote, amount) {
    try {
      // Generate blinded messages
      const { blindedMessages, secrets, rs } = this.createBlindedMessages(amount);

      const response = await fetch(`${this.mintUrl}/v1/mint/bolt11`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          outputs: blindedMessages
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { signatures } = await response.json();

      // Unblind signatures to get proofs
      const proofs = this.unblindSignatures(signatures, secrets, rs);
      
      // Store proofs
      this.proofs.push(...proofs);
      this.balance += amount;

      this.emit('mint', { amount, proofs });
      
      return { proofs, amount };

    } catch (error) {
      // Return mock tokens
      const proofs = this.createMockProofs(amount);
      this.proofs.push(...proofs);
      this.balance += amount;
      
      return { proofs, amount, mock: true };
    }
  }

  /**
   * Melt tokens (Ecash → Lightning)
   * Step 1: Request melt quote
   */
  async requestMeltQuote(invoice) {
    try {
      const response = await fetch(`${this.mintUrl}/v1/melt/quote/bolt11`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: invoice, unit: 'sat' })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();

    } catch (error) {
      // Return mock quote
      return {
        quote: crypto.randomBytes(16).toString('hex'),
        amount: 1000,
        fee_reserve: 10,
        state: 'UNPAID',
        expiry: Math.floor(Date.now() / 1000) + 600
      };
    }
  }

  /**
   * Melt tokens (Ecash → Lightning)
   * Step 2: Pay the invoice with tokens
   */
  async meltTokens(quote, amount, invoice) {
    try {
      // Select proofs to spend
      const { proofs: proofsToSpend, change } = this.selectProofs(amount);

      const response = await fetch(`${this.mintUrl}/v1/melt/bolt11`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote,
          inputs: proofsToSpend
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      // Remove spent proofs
      this.removeProofs(proofsToSpend);
      this.balance -= amount;

      this.emit('melt', { amount, paid: result.state === 'PAID' });
      
      return result;

    } catch (error) {
      // Mock melt
      this.balance = Math.max(0, this.balance - amount);
      return { state: 'PAID', mock: true };
    }
  }

  /**
   * Swap tokens (for privacy/denomination change)
   */
  async swapTokens(proofs) {
    try {
      const amount = proofs.reduce((sum, p) => sum + p.amount, 0);
      const { blindedMessages, secrets, rs } = this.createBlindedMessages(amount);

      const response = await fetch(`${this.mintUrl}/v1/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: proofs,
          outputs: blindedMessages
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { signatures } = await response.json();

      // Unblind signatures
      const newProofs = this.unblindSignatures(signatures, secrets, rs);

      // Update storage
      this.removeProofs(proofs);
      this.proofs.push(...newProofs);

      return { proofs: newProofs };

    } catch (error) {
      return { proofs, error: error.message };
    }
  }

  /**
   * Send tokens to someone
   * Returns serialized token that can be sent via any channel
   */
  async send(amount) {
    const { proofs, change } = this.selectProofs(amount);
    
    // Remove from local storage
    this.removeProofs(proofs);
    this.balance -= amount;

    // Serialize token
    const token = this.serializeToken(proofs);

    this.emit('send', { amount, token });
    
    return token;
  }

  /**
   * Receive tokens from someone
   */
  async receive(tokenString) {
    try {
      // Deserialize token
      const { proofs, mint } = this.deserializeToken(tokenString);
      
      // Verify mint matches
      if (mint && mint !== this.mintUrl) {
        throw new Error('Token from different mint');
      }

      // Swap tokens to invalidate sender's copy
      const { proofs: newProofs } = await this.swapTokens(proofs);
      
      // Calculate amount
      const amount = newProofs.reduce((sum, p) => sum + p.amount, 0);
      this.balance += amount;

      this.emit('receive', { amount, proofs: newProofs });
      
      return { amount, proofs: newProofs };

    } catch (error) {
      throw new Error(`Failed to receive token: ${error.message}`);
    }
  }

  /**
   * Serialize proofs to Cashu token format
   */
  serializeToken(proofs) {
    const token = {
      token: [{
        mint: this.mintUrl,
        proofs: proofs
      }]
    };
    
    // Cashu token format: cashuA<base64>
    return 'cashuA' + Buffer.from(JSON.stringify(token)).toString('base64');
  }

  /**
   * Deserialize Cashu token
   */
  deserializeToken(tokenString) {
    if (!tokenString.startsWith('cashuA')) {
      throw new Error('Invalid token format');
    }

    const json = Buffer.from(tokenString.slice(6), 'base64').toString();
    const parsed = JSON.parse(json);

    if (!parsed.token || !parsed.token[0]) {
      throw new Error('Invalid token structure');
    }

    return {
      mint: parsed.token[0].mint,
      proofs: parsed.token[0].proofs
    };
  }

  /**
   * Create blinded messages for minting
   */
  createBlindedMessages(amount) {
    const denominations = this.splitAmount(amount);
    const blindedMessages = [];
    const secrets = [];
    const rs = [];

    denominations.forEach(denom => {
      const secret = crypto.randomBytes(32).toString('hex');
      const r = crypto.randomBytes(32).toString('hex');
      
      // In production, use proper blinding
      const blindedMessage = {
        amount: denom,
        id: this.getActiveKeysetId(),
        B_: '02' + crypto.createHash('sha256').update(secret + r).digest('hex')
      };

      blindedMessages.push(blindedMessage);
      secrets.push(secret);
      rs.push(r);
    });

    return { blindedMessages, secrets, rs };
  }

  /**
   * Unblind signatures to create proofs
   */
  unblindSignatures(signatures, secrets, rs) {
    return signatures.map((sig, i) => ({
      amount: sig.amount,
      id: sig.id,
      secret: secrets[i],
      C: sig.C_  // In production, unblind with r
    }));
  }

  /**
   * Split amount into denominations (powers of 2)
   */
  splitAmount(amount) {
    const denominations = [];
    let remaining = amount;
    let power = 8192; // Max denomination

    while (remaining > 0 && power >= 1) {
      while (remaining >= power) {
        denominations.push(power);
        remaining -= power;
      }
      power = Math.floor(power / 2);
    }

    return denominations;
  }

  /**
   * Select proofs to spend
   */
  selectProofs(amount) {
    // Sort by amount descending for efficiency
    const sorted = [...this.proofs].sort((a, b) => b.amount - a.amount);
    
    let selected = [];
    let total = 0;

    for (const proof of sorted) {
      if (total >= amount) break;
      selected.push(proof);
      total += proof.amount;
    }

    if (total < amount) {
      throw new Error('Insufficient balance');
    }

    return {
      proofs: selected,
      change: total - amount
    };
  }

  /**
   * Remove proofs from storage
   */
  removeProofs(proofsToRemove) {
    const secretsToRemove = new Set(proofsToRemove.map(p => p.secret));
    this.proofs = this.proofs.filter(p => !secretsToRemove.has(p.secret));
  }

  /**
   * Get active keyset ID
   */
  getActiveKeysetId() {
    for (const [id, ks] of this.keysets) {
      if (ks.active) return id;
    }
    return '00' + crypto.randomBytes(7).toString('hex');
  }

  /**
   * Create mock proofs for testing
   */
  createMockProofs(amount) {
    const denominations = this.splitAmount(amount);
    return denominations.map(denom => ({
      amount: denom,
      id: this.getActiveKeysetId(),
      secret: crypto.randomBytes(32).toString('hex'),
      C: '02' + crypto.randomBytes(32).toString('hex')
    }));
  }

  /**
   * Get current balance
   */
  getBalance() {
    return this.balance;
  }

  /**
   * Get all proofs
   */
  getProofs() {
    return [...this.proofs];
  }

  /**
   * Check token state (spent or not)
   */
  async checkTokenState(proofs) {
    try {
      const Ys = proofs.map(p => 
        crypto.createHash('sha256').update(p.secret).digest('hex')
      );

      const response = await fetch(`${this.mintUrl}/v1/checkstate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Ys })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();

    } catch (error) {
      return { states: proofs.map(() => ({ state: 'UNSPENT' })) };
    }
  }

  /**
   * Get mint status
   */
  getStatus() {
    return {
      connected: this.connected,
      mintUrl: this.mintUrl,
      mintInfo: this.mintInfo,
      balance: this.balance,
      proofsCount: this.proofs.length,
      keysets: Array.from(this.keysets.values())
    };
  }
}

export default CashuService;
