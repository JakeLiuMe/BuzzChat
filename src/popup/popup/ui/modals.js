// BuzzChat - Modal Management
// Modal focus trap and management

// Modal Focus Trap
export const FocusTrap = {
  activeModal: null,
  previouslyFocusedElement: null,

  activate(modal) {
    this.activeModal = modal;
    this.previouslyFocusedElement = document.activeElement;

    // Focus first focusable element
    const focusable = this.getFocusableElements(modal);
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
  },

  deactivate() {
    document.removeEventListener('keydown', this.handleKeyDown);

    // Return focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }

    this.activeModal = null;
    this.previouslyFocusedElement = null;
  },

  getFocusableElements(container) {
    const selectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ];
    return Array.from(container.querySelectorAll(selectors.join(', ')));
  },

  handleKeyDown: function(e) {
    if (!FocusTrap.activeModal) return;

    // Escape to close
    if (e.key === 'Escape') {
      FocusTrap.activeModal.classList.remove('active');
      FocusTrap.deactivate();
      return;
    }

    // Tab trap
    if (e.key === 'Tab') {
      const focusable = FocusTrap.getFocusableElements(FocusTrap.activeModal);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
};

// Open a modal with focus trap
export function openModal(modal) {
  if (!modal) return;
  modal.classList.add('active');
  FocusTrap.activate(modal);
}

// Close a modal and deactivate focus trap
export function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('active');
  FocusTrap.deactivate();
}

// Setup modal close on backdrop click
export function setupModalBackdropClose(modal) {
  if (!modal) return;
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
}
