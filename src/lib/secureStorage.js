// BuzzChat - Secure Storage Module
// Encrypts sensitive data before storing in browser storage
// Uses Web Crypto API for AES-GCM encryption

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const SecureStorage = {
  ENCRYPTION_KEY_NAME: 'buzzchat_encryption_key',
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,

  // Get or generate the encryption key
  async getEncryptionKey() {
    // Try to get existing key from local storage
    const result = await new Promise(resolve => {
      browserAPI.storage.local.get([this.ENCRYPTION_KEY_NAME], resolve);
    });

    if (result[this.ENCRYPTION_KEY_NAME]) {
      // Import existing key
      const keyData = Uint8Array.from(atob(result[this.ENCRYPTION_KEY_NAME]), c => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false,
        ['encrypt', 'decrypt']
      );
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );

    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyString = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

    await new Promise(resolve => {
      browserAPI.storage.local.set({ [this.ENCRYPTION_KEY_NAME]: keyString }, resolve);
    });

    return key;
  },

  // Encrypt a string value
  async encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
      return null;
    }

    try {
      const key = await this.getEncryptionKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      const ciphertext = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        data
      );

      // Combine IV and ciphertext, encode as base64
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(ciphertext), iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('[BuzzChat] Encryption failed:', error);
      return null;
    }
  },

  // Decrypt an encrypted value
  async decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'string') {
      return null;
    }

    try {
      const key = await this.getEncryptionKey();
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

      // Extract IV and ciphertext
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('[BuzzChat] Decryption failed:', error);
      return null;
    }
  },

  // Encrypt an object (JSON-serializable)
  async encryptObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    try {
      const jsonString = JSON.stringify(obj);
      return await this.encrypt(jsonString);
    } catch (error) {
      console.error('[BuzzChat] Object encryption failed:', error);
      return null;
    }
  },

  // Decrypt to an object
  async decryptObject(encryptedData) {
    const decrypted = await this.decrypt(encryptedData);
    if (!decrypted) {
      return null;
    }

    try {
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('[BuzzChat] Object decryption failed:', error);
      return null;
    }
  },

  // Store encrypted value
  async setSecure(key, value) {
    const encrypted = typeof value === 'object'
      ? await this.encryptObject(value)
      : await this.encrypt(String(value));

    if (!encrypted) {
      throw new Error('Encryption failed');
    }

    return new Promise((resolve, reject) => {
      browserAPI.storage.local.set({ [key]: encrypted }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  // Get and decrypt value
  async getSecure(key, isObject = false) {
    const result = await new Promise(resolve => {
      browserAPI.storage.local.get([key], resolve);
    });

    if (!result[key]) {
      return null;
    }

    return isObject
      ? await this.decryptObject(result[key])
      : await this.decrypt(result[key]);
  },

  // Remove encrypted value
  async removeSecure(key) {
    return new Promise((resolve, reject) => {
      browserAPI.storage.local.remove([key], () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  // Hash sensitive data for storage (one-way, for comparison)
  async hash(data) {
    if (!data || typeof data !== 'string') {
      return null;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.error('[BuzzChat] Hashing failed:', error);
      return null;
    }
  }
};

// Export for ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SecureStorage;
}
