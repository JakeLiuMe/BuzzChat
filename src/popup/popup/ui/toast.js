// BuzzChat - Toast Notification System
// Toast notifications and save indicator

// Toast notification system
export const Toast = {
  container: null,

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    this.container.setAttribute('role', 'status');
    this.container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.container);
  },

  show(message, type = 'info', duration = 3000) {
    this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    // Build toast using safe DOM methods (no innerHTML with user data)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = icons[type] || icons.info;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    toast.appendChild(iconSpan);
    toast.appendChild(messageSpan);

    this.container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  },

  success(message) { return this.show(message, 'success'); },
  error(message) { return this.show(message, 'error'); },
  info(message) { return this.show(message, 'info'); },
  warning(message) { return this.show(message, 'warning'); }
};

// Save Indicator
export const SaveIndicator = {
  element: null,
  timeout: null,

  init() {
    this.element = document.getElementById('saveIndicator');
  },

  show() {
    if (!this.element) this.init();
    if (!this.element) return;

    // Clear any pending timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Show the indicator
    this.element.classList.add('visible');

    // Hide after 2 seconds
    this.timeout = setTimeout(() => {
      this.element.classList.remove('visible');
    }, 2000);
  }
};

// Loading state helpers
export const Loading = {
  show(button) {
    if (!button) return;
    button.classList.add('loading');
    button.disabled = true;
  },

  hide(button) {
    if (!button) return;
    button.classList.remove('loading');
    button.disabled = false;
  }
};
