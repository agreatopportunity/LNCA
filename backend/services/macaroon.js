/**
 * Macaroon Helper
 * 
 * Simple macaroon implementation for L402 authentication
 * In production, use the macaroons.js library
 */

import crypto from 'crypto';

/**
 * Create a new macaroon
 */
export function createMacaroon(location, identifier, rootKey) {
  const sig = crypto.createHmac('sha256', rootKey)
    .update(identifier)
    .digest();

  return {
    location,
    identifier,
    caveats: [],
    signature: sig.toString('hex')
  };
}

/**
 * Add a first-party caveat
 */
export function addFirstPartyCaveat(macaroon, caveat) {
  const newMacaroon = { ...macaroon, caveats: [...macaroon.caveats, caveat] };
  
  // Update signature
  const sig = crypto.createHmac('sha256', Buffer.from(macaroon.signature, 'hex'))
    .update(caveat)
    .digest();
  
  newMacaroon.signature = sig.toString('hex');
  
  return newMacaroon;
}

/**
 * Verify a macaroon
 */
export function verifyMacaroon(macaroon, rootKey, verifiers = {}) {
  try {
    // Start with root key
    let sig = crypto.createHmac('sha256', rootKey)
      .update(macaroon.identifier)
      .digest();

    // Chain through caveats
    for (const caveat of macaroon.caveats) {
      // Verify caveat
      const [key, value] = caveat.split(' = ');
      
      if (verifiers[key]) {
        if (!verifiers[key](value)) {
          return { valid: false, error: `Caveat failed: ${caveat}` };
        }
      }

      // Update signature chain
      sig = crypto.createHmac('sha256', sig)
        .update(caveat)
        .digest();
    }

    // Compare signatures
    if (sig.toString('hex') !== macaroon.signature) {
      return { valid: false, error: 'Signature mismatch' };
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Serialize macaroon to base64
 */
export function serializeMacaroon(macaroon) {
  return Buffer.from(JSON.stringify(macaroon)).toString('base64');
}

/**
 * Deserialize macaroon from base64
 */
export function deserializeMacaroon(serialized) {
  return JSON.parse(Buffer.from(serialized, 'base64').toString());
}

/**
 * Create standard L402 caveats
 */
export function createL402Caveats(options = {}) {
  const caveats = [];

  if (options.expires) {
    caveats.push(`expires = ${options.expires}`);
  }

  if (options.provider) {
    caveats.push(`provider = ${options.provider}`);
  }

  if (options.maxTokens) {
    caveats.push(`max_tokens = ${options.maxTokens}`);
  }

  if (options.model) {
    caveats.push(`model = ${options.model}`);
  }

  return caveats;
}

export default {
  createMacaroon,
  addFirstPartyCaveat,
  verifyMacaroon,
  serializeMacaroon,
  deserializeMacaroon,
  createL402Caveats
};
