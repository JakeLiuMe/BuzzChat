// BuzzChat - Celebrations & Delight
// Making sales feel GOOD

/**
 * Show confetti animation
 */
export function showConfetti(duration = 2000) {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const confettiCount = 50;
  
  const container = document.createElement('div');
  container.className = 'confetti-container';
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 10000;
    overflow: hidden;
  `;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const animDuration = Math.random() * 1 + 1.5;
    const delay = Math.random() * 0.5;
    
    confetti.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      top: -20px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti-fall ${animDuration}s ease-out ${delay}s forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
    
    container.appendChild(confetti);
  }
  
  document.body.appendChild(container);
  
  setTimeout(() => container.remove(), duration + 500);
}

/**
 * Show sale celebration
 */
export function celebrateSale(productName, price) {
  // Confetti
  showConfetti();
  
  // Sound (optional - check settings)
  playSound('sale');
  
  // Big notification
  showBigNotification({
    icon: '🎉',
    title: 'SOLD!',
    subtitle: `${productName} - $${price.toFixed(2)}`,
    duration: 3000
  });
}

/**
 * Show achievement unlocked
 */
export function showAchievement(title, description, icon = '🏆') {
  showBigNotification({
    icon,
    title: 'Achievement Unlocked!',
    subtitle: `${title}: ${description}`,
    duration: 4000,
    style: 'achievement'
  });
  
  playSound('achievement');
}

/**
 * Show big notification
 */
export function showBigNotification({ icon, title, subtitle, duration = 3000, style = 'default' }) {
  const notification = document.createElement('div');
  notification.className = `big-notification big-notification-${style}`;
  notification.innerHTML = `
    <div class="big-notification-icon">${icon}</div>
    <div class="big-notification-content">
      <div class="big-notification-title">${title}</div>
      <div class="big-notification-subtitle">${subtitle}</div>
    </div>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 24px 32px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    z-index: 10001;
    animation: notification-pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const iconEl = notification.querySelector('.big-notification-icon');
  iconEl.style.cssText = 'font-size: 48px;';
  
  const titleEl = notification.querySelector('.big-notification-title');
  titleEl.style.cssText = 'font-size: 24px; font-weight: 700;';
  
  const subtitleEl = notification.querySelector('.big-notification-subtitle');
  subtitleEl.style.cssText = 'font-size: 14px; opacity: 0.9; margin-top: 4px;';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'notification-pop 0.3s ease-in reverse forwards';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Play sound effect
 */
export function playSound(type) {
  // Check if sounds are enabled
  const soundsEnabled = localStorage.getItem('buzzchat_sounds') !== 'false';
  if (!soundsEnabled) return;
  
  const sounds = {
    sale: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVdIYIfTzaJtOCQ0crLCl35uYHGQpamPYTYvU5e9wZl3Xz5rq+DmrnoNAB2A4PXfqHNcXYSo0OevdCskSaLb7LGBTSBDe7rOroNFMU1zvefLhjMFNXzD69qWTCQ2c63u6Kp5IgwueMTiwYhXQluEqM7ot4JAIU6U1OfBe0EqO3Cs3OSpfDUQNXS86OaxdBMMRJnk+ue5bBUISqPp+OmiUwsIXbLz9tqRQQ0CYcL9+daQOAAAZdD/+86KMw==',
    achievement: 'data:audio/wav;base64,UklGRl4FAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YToFAACAf3+AgYGBgYKCg4ODhIWFhoeHiImJiouLjI2Njo+PkJGRkpOTlJWVlpeXmJmZmpucnJ2enp+goKGio6OkpaWmp6eoqaqrrK2ur7CwsbKztLW2tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8=',
    click: 'data:audio/wav;base64,UklGRjQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YRADAACAgoOFh4mLjZCSlJaYmpyeoKKkpqiqrK6wsrS2uLq8vsDCxMbIyszO0NLU1tjZ29ze4OLk5ujq7O7w8vT2+Pn7/f4='
  };
  
  if (sounds[type]) {
    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignore autoplay errors
    } catch (e) {
      // Audio not supported
    }
  }
}

/**
 * Show streak notification
 */
export function showStreak(count, type = 'sales') {
  const streakMessages = {
    3: '🔥 On fire!',
    5: '⚡ Unstoppable!',
    10: '🌟 Legendary!',
    25: '👑 GODLIKE!'
  };
  
  const thresholds = [3, 5, 10, 25].filter(t => t <= count);
  const currentThreshold = thresholds[thresholds.length - 1];
  
  if (currentThreshold && count === currentThreshold) {
    showBigNotification({
      icon: '🔥',
      title: `${count} ${type} streak!`,
      subtitle: streakMessages[currentThreshold],
      duration: 2500,
      style: 'streak'
    });
  }
}

/**
 * Pulse an element to draw attention
 */
export function pulseElement(element, color = '#4ECDC4') {
  if (!element) return;
  
  element.style.animation = 'none';
  element.offsetHeight; // Trigger reflow
  element.style.animation = 'pulse-attention 0.6s ease-out';
  element.style.boxShadow = `0 0 0 0 ${color}`;
  
  setTimeout(() => {
    element.style.animation = '';
    element.style.boxShadow = '';
  }, 600);
}

/**
 * Add celebration CSS to document
 */
export function initCelebrations() {
  if (document.getElementById('buzzchat-celebrations-css')) return;
  
  const style = document.createElement('style');
  style.id = 'buzzchat-celebrations-css';
  style.textContent = `
    @keyframes confetti-fall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translateY(400px) rotate(720deg);
        opacity: 0;
      }
    }
    
    @keyframes notification-pop {
      0% {
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.1);
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    
    @keyframes pulse-attention {
      0% {
        box-shadow: 0 0 0 0 currentColor;
      }
      70% {
        box-shadow: 0 0 0 10px transparent;
      }
      100% {
        box-shadow: 0 0 0 0 transparent;
      }
    }
    
    .big-notification-achievement {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
    }
    
    .big-notification-streak {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
    }
  `;
  
  document.head.appendChild(style);
}

// Auto-init when imported
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCelebrations);
  } else {
    initCelebrations();
  }
}

export default {
  showConfetti,
  celebrateSale,
  showAchievement,
  showBigNotification,
  playSound,
  showStreak,
  pulseElement,
  initCelebrations
};
