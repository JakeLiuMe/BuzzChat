// BuzzChat - First-Run Consent Manager
// Handles privacy consent on first installation

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

const ConsentManager = {
  STORAGE_KEY: 'buzzchat_consent',
  PRIVACY_POLICY_URL: 'https://buzzchat.app/privacy',

  /**
   * Check if user has given consent
   * @returns {Promise<boolean>}
   */
  async hasConsent() {
    return new Promise((resolve) => {
      browserAPI.storage.local.get([this.STORAGE_KEY], (result) => {
        if (browserAPI.runtime.lastError) {
          console.error('[BuzzChat] Failed to check consent:', browserAPI.runtime.lastError);
          resolve(false);
          return;
        }
        const consent = result[this.STORAGE_KEY];
        resolve(consent && consent.accepted === true);
      });
    });
  },

  /**
   * Record user consent
   * @param {boolean} accepted - Whether user accepted
   * @returns {Promise<void>}
   */
  async recordConsent(accepted) {
    return new Promise((resolve, reject) => {
      const consentData = {
        accepted: accepted,
        timestamp: Date.now(),
        version: '1.0'
      };

      browserAPI.storage.local.set({ [this.STORAGE_KEY]: consentData }, () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  },

  /**
   * Show consent dialog and wait for user response
   * @returns {Promise<boolean>} - True if user accepted
   */
  showConsentDialog() {
    return new Promise((resolve) => {
      // Check if dialog already exists
      if (document.getElementById('buzzchat-consent-overlay')) {
        return;
      }

      // Create overlay
      const overlay = document.createElement('div');
      overlay.id = 'buzzchat-consent-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 100000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Create dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      `;

      // Dialog header
      const header = document.createElement('div');
      header.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
      `;

      const icon = document.createElement('div');
      icon.style.cssText = `
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      `;
      icon.textContent = '🐝';

      const title = document.createElement('h2');
      title.style.cssText = `
        margin: 0;
        font-size: 20px;
        color: #1f2937;
      `;
      title.textContent = 'Welcome to BuzzChat!';

      header.appendChild(icon);
      header.appendChild(title);

      // Content
      const content = document.createElement('div');
      content.style.cssText = `
        color: #4b5563;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 20px;
      `;

      const intro = document.createElement('p');
      intro.style.margin = '0 0 12px 0';
      intro.textContent = 'Before you get started, please review how we handle your data:';

      const list = document.createElement('ul');
      list.style.cssText = `
        margin: 0 0 12px 0;
        padding-left: 20px;
      `;

      const items = [
        'Your settings are stored locally in your browser',
        'We collect anonymous usage analytics to improve the extension',
        'Payment processing is handled securely by ExtensionPay',
        'We never collect chat content or viewer information'
      ];

      items.forEach(text => {
        const li = document.createElement('li');
        li.style.marginBottom = '4px';
        li.textContent = text;
        list.appendChild(li);
      });

      const policyLink = document.createElement('p');
      policyLink.style.margin = '0';

      const linkText = document.createTextNode('Read our full ');
      const link = document.createElement('a');
      link.href = this.PRIVACY_POLICY_URL;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.color = '#7c3aed';
      link.textContent = 'Privacy Policy';

      policyLink.appendChild(linkText);
      policyLink.appendChild(link);

      content.appendChild(intro);
      content.appendChild(list);
      content.appendChild(policyLink);

      // Buttons
      const buttons = document.createElement('div');
      buttons.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      `;

      const declineBtn = document.createElement('button');
      declineBtn.style.cssText = `
        padding: 10px 20px;
        border: 1px solid #d1d5db;
        background: white;
        color: #4b5563;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      declineBtn.textContent = 'Decline';
      declineBtn.onmouseover = () => declineBtn.style.background = '#f3f4f6';
      declineBtn.onmouseout = () => declineBtn.style.background = 'white';

      const acceptBtn = document.createElement('button');
      acceptBtn.style.cssText = `
        padding: 10px 24px;
        border: none;
        background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%);
        color: white;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      `;
      acceptBtn.textContent = 'Accept & Continue';
      acceptBtn.onmouseover = () => acceptBtn.style.transform = 'scale(1.02)';
      acceptBtn.onmouseout = () => acceptBtn.style.transform = 'scale(1)';

      buttons.appendChild(declineBtn);
      buttons.appendChild(acceptBtn);

      // Assemble dialog
      dialog.appendChild(header);
      dialog.appendChild(content);
      dialog.appendChild(buttons);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Event handlers
      const cleanup = () => {
        overlay.remove();
      };

      acceptBtn.addEventListener('click', async () => {
        await this.recordConsent(true);
        cleanup();
        resolve(true);
      });

      declineBtn.addEventListener('click', async () => {
        await this.recordConsent(false);
        cleanup();
        resolve(false);
      });
    });
  },

  /**
   * Initialize consent check - show dialog if first run
   * @returns {Promise<boolean>} - True if user has given consent
   */
  async init() {
    const hasConsent = await this.hasConsent();

    if (hasConsent) {
      return true;
    }

    // Show consent dialog and wait for response
    const accepted = await this.showConsentDialog();
    return accepted;
  },

  /**
   * Withdraw consent (for settings page)
   * @returns {Promise<void>}
   */
  async withdrawConsent() {
    return new Promise((resolve, reject) => {
      browserAPI.storage.local.remove([this.STORAGE_KEY], () => {
        if (browserAPI.runtime.lastError) {
          reject(browserAPI.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
};

// Export for ES modules and CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConsentManager;
}
