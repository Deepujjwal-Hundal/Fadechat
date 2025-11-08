/**
 * Encryption Utilities
 * Provides AES-256 encryption and decryption for messages
 */

const crypto = require('crypto');

// Algorithm for encryption
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Generate a random encryption key
 * @returns {string} Base64 encoded encryption key
 */
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

/**
 * Encrypt a message using AES-256-CBC
 * @param {string} text - Plain text message to encrypt
 * @param {string} key - Base64 encoded encryption key
 * @returns {string} Base64 encoded encrypted message with IV
 */
function encryptMessage(text, key) {
  try {
    // Convert key from base64 to buffer
    const keyBuffer = Buffer.from(key, 'base64');

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt the message
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Combine IV and encrypted data (IV:encrypted)
    const result = iv.toString('base64') + ':' + encrypted;

    return result;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt a message using AES-256-CBC
 * @param {string} encryptedData - Base64 encoded encrypted message with IV
 * @param {string} key - Base64 encoded encryption key
 * @returns {string} Decrypted plain text message
 */
function decryptMessage(encryptedData, key) {
  try {
    // Convert key from base64 to buffer
    const keyBuffer = Buffer.from(key, 'base64');

    // Split IV and encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    // Decrypt the message
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

module.exports = {
  encryptMessage,
  decryptMessage,
  generateKey
};

