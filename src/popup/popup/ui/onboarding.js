// BuzzChat - Onboarding Wizard
// Making first-time setup actually enjoyable

import { browserAPI } from '../core/config.js';
import { Toast } from './toast.js';

const ONBOARDING_KEY = 'buzzchatOnboardingComplete';

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([ONBOARDING_KEY], (result) => {
      resolve(!result[ONBOARDING_KEY]);
    });
  });
}

/**
 * Mark onboarding as complete
 */
export async function completeOnboarding() {
  return new Promise((resolve) => {
    browserAPI.storage.local.set({ [ONBOARDING_KEY]: true }, resolve);
  });
}

/**
 * Reset onboarding (for testing)
 */
export async function resetOnboarding() {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove([ONBOARDING_KEY], resolve);
  });
}

/**
 * Show the onboarding wizard
 */
export function showOnboardingWizard(onComplete) {
  const steps = [
    {
      title: "Welcome to BuzzChat! 🐝",
      subtitle: "Your AI-powered live selling assistant",
      content: `
        <div class="onboarding-hero">
          <div class="hero-icon">🎯</div>
          <p>BuzzChat helps you:</p>
          <ul class="onboarding-benefits">
            <li>✨ Auto-reply to common questions</li>
            <li>📦 Track inventory during streams</li>
            <li>🛒 Never miss a "SOLD" comment</li>
            <li>👥 Recognize repeat customers</li>
          </ul>
        </div>
      `,
      action: "Let's Go!"
    },
    {
      title: "Quick Setup 🚀",
      subtitle: "Just 3 things to get started",
      content: `
        <div class="onboarding-setup">
          <div class="setup-item">
            <span class="setup-number">1</span>
            <div class="setup-content">
              <strong>Toggle the bot ON</strong>
              <p>Use the "Bot Active" switch at the top</p>
            </div>
          </div>
          <div class="setup-item">
            <span class="setup-number">2</span>
            <div class="setup-content">
              <strong>Add a welcome message</strong>
              <p>Greet new viewers automatically</p>
            </div>
          </div>
          <div class="setup-item">
            <span class="setup-number">3</span>
            <div class="setup-content">
              <strong>Add 1-2 FAQ rules</strong>
              <p>Auto-answer shipping, payment questions</p>
            </div>
          </div>
        </div>
      `,
      action: "Got it!"
    },
    {
      title: "Pro Tips 💡",
      subtitle: "Get the most out of BuzzChat",
      content: `
        <div class="onboarding-tips">
          <div class="tip-item">
            <span class="tip-icon">⚡</span>
            <div class="tip-text">
              <strong>Quick Add Inventory</strong>
              <p>Type "Jordan 4, $180, 3" to add items fast</p>
            </div>
          </div>
          <div class="tip-item">
            <span class="tip-icon">🔔</span>
            <div class="tip-text">
              <strong>SOLD Detection</strong>
              <p>We'll catch "sold", "mine", "I'll take it" automatically</p>
            </div>
          </div>
          <div class="tip-item">
            <span class="tip-icon">⌨️</span>
            <div class="tip-text">
              <strong>Keyboard Shortcuts</strong>
              <p>Press 1-9 for quick replies during streams</p>
            </div>
          </div>
        </div>
      `,
      action: "Start Selling! 🎉"
    }
  ];

  let currentStep = 0;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'onboarding-modal';
  modal.innerHTML = `
    <div class="onboarding-backdrop"></div>
    <div class="onboarding-content">
      <div class="onboarding-progress">
        ${steps.map((_, i) => `<div class="progress-dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
      </div>
      <div class="onboarding-step">
        <h2 class="onboarding-title"></h2>
        <p class="onboarding-subtitle"></p>
        <div class="onboarding-body"></div>
      </div>
      <div class="onboarding-footer">
        <button class="btn btn-secondary onboarding-skip">Skip</button>
        <button class="btn btn-primary onboarding-next"></button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .onboarding-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .onboarding-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
    }
    .onboarding-content {
      position: relative;
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      animation: onboarding-appear 0.3s ease-out;
    }
    @keyframes onboarding-appear {
      from { opacity: 0; transform: scale(0.9) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .onboarding-progress {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 24px;
    }
    .progress-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #e0e0e0;
      transition: all 0.3s;
    }
    .progress-dot.active {
      background: #7c3aed;
      width: 24px;
      border-radius: 4px;
    }
    .progress-dot.completed {
      background: #4ade80;
    }
    .onboarding-title {
      font-size: 24px;
      font-weight: 700;
      text-align: center;
      margin-bottom: 8px;
      color: #1f2937;
    }
    .onboarding-subtitle {
      text-align: center;
      color: #6b7280;
      margin-bottom: 24px;
    }
    .onboarding-body {
      margin-bottom: 24px;
    }
    .onboarding-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }
    .onboarding-footer .btn {
      flex: 1;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .onboarding-footer .btn-secondary {
      background: #f3f4f6;
      color: #6b7280;
      border: none;
    }
    .onboarding-footer .btn-primary {
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      border: none;
    }
    .onboarding-footer .btn:hover {
      transform: translateY(-1px);
    }
    
    /* Content styles */
    .onboarding-hero { text-align: center; }
    .hero-icon { font-size: 64px; margin-bottom: 16px; }
    .onboarding-benefits {
      list-style: none;
      padding: 0;
      text-align: left;
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px 20px;
    }
    .onboarding-benefits li {
      padding: 8px 0;
      color: #374151;
    }
    
    .setup-item {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    .setup-number {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
    }
    .setup-content strong { display: block; color: #1f2937; }
    .setup-content p { color: #6b7280; font-size: 14px; margin-top: 4px; }
    
    .tip-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .tip-icon { font-size: 24px; }
    .tip-text strong { display: block; color: #1f2937; font-size: 14px; }
    .tip-text p { color: #6b7280; font-size: 13px; margin-top: 2px; }
    
    /* Dark mode */
    [data-theme="dark"] .onboarding-content {
      background: #1f2937;
    }
    [data-theme="dark"] .onboarding-title { color: #f9fafb; }
    [data-theme="dark"] .onboarding-subtitle { color: #9ca3af; }
    [data-theme="dark"] .onboarding-benefits,
    [data-theme="dark"] .tip-item { background: #374151; }
    [data-theme="dark"] .onboarding-benefits li,
    [data-theme="dark"] .setup-content strong,
    [data-theme="dark"] .tip-text strong { color: #f9fafb; }
    [data-theme="dark"] .setup-content p,
    [data-theme="dark"] .tip-text p { color: #9ca3af; }
    [data-theme="dark"] .onboarding-footer .btn-secondary {
      background: #374151;
      color: #9ca3af;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(modal);

  // Update step content
  function updateStep() {
    const step = steps[currentStep];
    modal.querySelector('.onboarding-title').textContent = step.title;
    modal.querySelector('.onboarding-subtitle').textContent = step.subtitle;
    modal.querySelector('.onboarding-body').innerHTML = step.content;
    modal.querySelector('.onboarding-next').textContent = step.action;
    
    // Update progress dots
    modal.querySelectorAll('.progress-dot').forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i < currentStep) dot.classList.add('completed');
      if (i === currentStep) dot.classList.add('active');
    });
  }

  // Event handlers
  modal.querySelector('.onboarding-next').addEventListener('click', () => {
    if (currentStep < steps.length - 1) {
      currentStep++;
      updateStep();
    } else {
      // Complete
      modal.remove();
      style.remove();
      completeOnboarding();
      Toast.success('Welcome to BuzzChat! 🐝');
      if (onComplete) onComplete();
    }
  });

  modal.querySelector('.onboarding-skip').addEventListener('click', () => {
    modal.remove();
    style.remove();
    completeOnboarding();
    if (onComplete) onComplete();
  });

  // Initialize
  updateStep();
}

/**
 * Check and show onboarding if needed
 */
export async function checkOnboarding(onComplete) {
  const needs = await needsOnboarding();
  if (needs) {
    showOnboardingWizard(onComplete);
    return true;
  }
  return false;
}

export default {
  needsOnboarding,
  completeOnboarding,
  resetOnboarding,
  showOnboardingWizard,
  checkOnboarding
};
