// BuzzChat - Onboarding Wizard
// 3-step onboarding wizard for new users

import { browserAPI } from './core/config.js';
import { settings } from './core/state.js';
import { saveSettings } from './core/storage.js';
import { Toast } from './ui/toast.js';
import { elements } from './ui/elements.js';
import { FocusTrap } from './ui/modals.js';
import { initUI } from './ui/init.js';

// Onboarding Wizard State
export const Onboarding = {
  currentStep: 1,
  totalSteps: 3,

  async check() {
    const result = await browserAPI.storage.sync.get(['buzzchatOnboarded']);
    if (!result.buzzchatOnboarded && elements.onboardingModal) {
      elements.onboardingModal.classList.add('active');
      FocusTrap.activate(elements.onboardingModal);
      this.updateUI();
    }
  },

  updateUI() {
    // Update step indicators
    document.querySelectorAll('.onboarding-step').forEach(step => {
      const stepNum = parseInt(step.dataset.step);
      step.classList.remove('active', 'completed');
      if (stepNum === this.currentStep) {
        step.classList.add('active');
      } else if (stepNum < this.currentStep) {
        step.classList.add('completed');
      }
    });

    // Update panels
    document.querySelectorAll('.onboarding-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const currentPanel = document.getElementById(`onboarding-step-${this.currentStep}`);
    if (currentPanel) {
      currentPanel.classList.add('active');
    }

    // Update buttons
    if (elements.onboardingPrevBtn) {
      elements.onboardingPrevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    }

    if (elements.onboardingNextBtn) {
      elements.onboardingNextBtn.textContent = this.currentStep === this.totalSteps ? 'Get Started' : 'Next';
      this.updateNextButtonState();
    }
  },

  updateNextButtonState() {
    if (!elements.onboardingNextBtn) return;

    if (this.currentStep === 1) {
      // Step 1: Must accept terms
      elements.onboardingNextBtn.disabled = !elements.acceptTerms?.checked;
    } else {
      // Steps 2 and 3: Always enabled
      elements.onboardingNextBtn.disabled = false;
    }
  },

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.updateUI();
    } else {
      this.complete();
    }
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateUI();
    }
  },

  updateMessagePreview() {
    if (elements.onboardingMessage && elements.messagePreview) {
      const message = elements.onboardingMessage.value || '';
      const preview = message.replace(/{username}/gi, 'StreamViewer');
      elements.messagePreview.textContent = preview || 'Your message preview will appear here...';
    }
  },

  async complete() {
    // Apply settings from wizard
    if (elements.setupWelcome?.checked) {
      settings.welcome.enabled = true;
      if (elements.onboardingMessage?.value) {
        settings.welcome.message = elements.onboardingMessage.value;
      }
    }
    if (elements.setupTimer?.checked) {
      settings.timer.enabled = true;
    }
    if (elements.setupFaq?.checked) {
      settings.faq.enabled = true;
    }

    await saveSettings();
    await browserAPI.storage.sync.set({ buzzchatOnboarded: true });

    if (elements.onboardingModal) {
      elements.onboardingModal.classList.remove('active');
      FocusTrap.deactivate();
    }

    // Refresh UI with new settings
    initUI();
    Toast.success('You\'re all set! Enable the bot when you\'re ready to go live.');
  }
};

// Legacy function for backwards compatibility
export async function checkOnboarding() {
  await Onboarding.check();
}

export async function completeOnboarding() {
  await Onboarding.complete();
}

// Initialize onboarding event listeners
export function initOnboardingListeners() {
  if (elements.acceptTerms) {
    elements.acceptTerms.addEventListener('change', () => {
      Onboarding.updateNextButtonState();
    });
  }

  if (elements.onboardingNextBtn) {
    elements.onboardingNextBtn.addEventListener('click', () => {
      Onboarding.nextStep();
    });
  }

  if (elements.onboardingPrevBtn) {
    elements.onboardingPrevBtn.addEventListener('click', () => {
      Onboarding.prevStep();
    });
  }

  if (elements.onboardingMessage) {
    elements.onboardingMessage.addEventListener('input', () => {
      Onboarding.updateMessagePreview();
    });
  }
}
