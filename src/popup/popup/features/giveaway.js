// BuzzChat - Giveaway Feature
// Giveaway wheel, winners, and confetti

import { browserAPI } from '../core/config.js';
import { settings, currentWinners, setCurrentWinners, giveawayEntries, setGiveawayEntries } from '../core/state.js';
import { sendMessageToContent } from '../core/storage.js';
import { sanitizeUsername, formatTime } from '../core/utils.js';
import { Toast, Loading } from '../ui/toast.js';
import { elements } from '../ui/elements.js';

// Spin the giveaway wheel (or random pick for free tier)
export async function spinGiveawayWheel() {
  // Prevent double-click during spin
  if (elements.spinWheelBtn?.classList.contains('loading')) return;

  Loading.show(elements.spinWheelBtn);

  try {
    // Get entries from content script
    const response = await sendMessageToContent('GET_GIVEAWAY_ENTRIES');
    if (!response || !response.entries || response.entries.length === 0) {
      Toast.warning('No entries yet! Wait for viewers to enter.');
      Loading.hide(elements.spinWheelBtn);
      return;
    }

    setGiveawayEntries(response.entries.slice(0, 1000).map(e => e.username));
    const numWinners = Math.max(1, Math.min(10, parseInt(elements.winnerCount?.value || '1')));

    if (giveawayEntries.length < numWinners) {
      Toast.warning(`Only ${giveawayEntries.length} entries. Need at least ${numWinners} to pick ${numWinners} winner(s).`);
      Loading.hide(elements.spinWheelBtn);
      return;
    }

    // Check tier: Free tier gets random pick, Pro/Business get animated wheel
    const isPro = settings.tier === 'pro' || settings.tier === 'business';

    if (isPro) {
      // Pro/Business: Show animated wheel spinner
      showWheelOverlay(giveawayEntries);
      await animateWheel(giveawayEntries, numWinners);
    } else {
      // Free tier: Simple random pick (no animation)
      await randomPickWinners(giveawayEntries, numWinners);
    }
  } finally {
    Loading.hide(elements.spinWheelBtn);
  }
}

// Simple random pick for free tier (no wheel animation)
async function randomPickWinners(entries, numWinners) {
  return new Promise(resolve => {
    // Pick random winners
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    setCurrentWinners(shuffled.slice(0, numWinners));

    // Brief delay for UX feedback
    setTimeout(() => {
      showWinnerDisplay(currentWinners);
      Toast.info('Upgrade to Pro for the animated spinner wheel!');
      resolve();
    }, 500);
  });
}

// Show the wheel overlay with segments
function showWheelOverlay(entries) {
  if (!elements.wheelOverlay || !elements.spinningWheel) return;

  // Build wheel segments (max 12 for visibility)
  const displayEntries = entries.slice(0, 12);
  const segmentAngle = 360 / displayEntries.length;

  elements.spinningWheel.innerHTML = '';
  elements.spinningWheel.style.transform = 'rotate(0deg)';

  displayEntries.forEach((name, index) => {
    const segment = document.createElement('div');
    segment.className = 'wheel-segment';
    segment.style.transform = `rotate(${index * segmentAngle - 90}deg) skewY(${90 - segmentAngle}deg)`;

    const inner = document.createElement('div');
    inner.className = 'wheel-segment-inner';
    inner.style.transform = `skewY(${segmentAngle - 90}deg)`;

    const nameSpan = document.createElement('span');
    nameSpan.textContent = name.slice(0, 10);
    inner.appendChild(nameSpan);

    segment.appendChild(inner);
    elements.spinningWheel.appendChild(segment);
  });

  elements.wheelStatus.textContent = 'Spinning...';
  elements.wheelOverlay.classList.add('active');
  elements.wheelOverlay.setAttribute('aria-busy', 'true');
}

// Animate the wheel spinning
async function animateWheel(entries, numWinners) {
  return new Promise(resolve => {
    // Pick random winners
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    setCurrentWinners(shuffled.slice(0, numWinners));

    // Calculate spin rotation (multiple full rotations + random offset)
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const targetRotation = spins * 360 + Math.random() * 360;

    // Animate
    if (elements.spinningWheel) {
      elements.spinningWheel.style.transition = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
      elements.spinningWheel.style.transform = `rotate(${targetRotation}deg)`;
    }

    // After spin completes
    setTimeout(() => {
      hideWheelOverlay();
      showWinnerDisplay(currentWinners);
      triggerConfetti();
      resolve();
    }, 4200);
  });
}

// Hide wheel overlay
function hideWheelOverlay() {
  if (elements.wheelOverlay) {
    elements.wheelOverlay.classList.remove('active');
    elements.wheelOverlay.setAttribute('aria-busy', 'false');
  }
}

// Show winner display
function showWinnerDisplay(winners) {
  if (!elements.winnerDisplay || !elements.winnerNames) return;

  elements.winnerNames.innerHTML = '';
  const title = elements.winnerDisplay.querySelector('.winner-title');
  if (title) {
    title.textContent = winners.length > 1 ? 'Winners!' : 'Winner!';
  }

  winners.forEach(winner => {
    const nameEl = document.createElement('div');
    nameEl.className = 'winner-name';
    nameEl.textContent = winner;
    elements.winnerNames.appendChild(nameEl);
  });

  elements.winnerDisplay.style.display = 'flex';
}

// Hide winner display
export function hideWinnerDisplay() {
  if (elements.winnerDisplay) {
    elements.winnerDisplay.style.display = 'none';
  }
}

// Announce winners in chat
export async function announceWinners() {
  if (currentWinners.length === 0) return;

  Loading.show(elements.announceWinnerBtn);

  try {
    const winnerList = currentWinners.join(', ');
    const message = currentWinners.length > 1
      ? `🎉 GIVEAWAY WINNERS: ${winnerList}! Congratulations! 🎉`
      : `🎉 GIVEAWAY WINNER: ${winnerList}! Congratulations! 🎉`;

    const success = await sendMessageToContent('SEND_TEMPLATE', { text: message });
    if (success) {
      Toast.success('Winners announced in chat!');
    }
  } finally {
    Loading.hide(elements.announceWinnerBtn);
  }
}

// Trigger confetti animation
export function triggerConfetti() {
  const canvas = elements.confettiCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  // Cap canvas size at 1920x1080 to prevent excessive memory usage on 4K displays
  canvas.width = Math.min(window.innerWidth, 1920);
  canvas.height = Math.min(window.innerHeight, 1080);

  const confettiPieces = [];
  // Use CSS variables for theme-aware confetti colors
  const computedStyle = getComputedStyle(document.documentElement);
  const colors = [
    computedStyle.getPropertyValue('--confetti-1').trim() || '#e74c3c',
    computedStyle.getPropertyValue('--confetti-2').trim() || '#3498db',
    computedStyle.getPropertyValue('--confetti-3').trim() || '#2ecc71',
    computedStyle.getPropertyValue('--confetti-4').trim() || '#f39c12',
    computedStyle.getPropertyValue('--confetti-5').trim() || '#9b59b6',
    computedStyle.getPropertyValue('--confetti-6').trim() || '#1abc9c',
    computedStyle.getPropertyValue('--confetti-7').trim() || '#e91e63',
    computedStyle.getPropertyValue('--confetti-8').trim() || '#00bcd4'
  ];

  // Create confetti pieces
  for (let i = 0; i < 150; i++) {
    confettiPieces.push({
      x: Math.random() * canvas.width,
      y: -20,
      size: Math.random() * 10 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    });
  }

  let animationFrame;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;
    confettiPieces.forEach(piece => {
      if (piece.y < canvas.height + 20) {
        activeCount++;
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotation += piece.rotationSpeed;

        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate((piece.rotation * Math.PI) / 180);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6);
        ctx.restore();
      }
    });

    if (activeCount > 0) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  animate();

  // Clean up after 5 seconds
  setTimeout(() => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 5000);
}

// Load giveaway entries from content script (using safe DOM methods)
export async function loadGiveawayData() {
  try {
    const response = await new Promise((resolve) => {
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, { type: 'GET_GIVEAWAY_ENTRIES' })
            .then(resolve)
            .catch(() => resolve({ success: false }));
        } else {
          resolve({ success: false });
        }
      });
    });

    if (response?.success) {
      // Update entry count (safe - textContent)
      if (elements.giveawayEntryCount) {
        elements.giveawayEntryCount.textContent = response.totalEntries || 0;
      }

      // Update entries list using safe DOM methods (no innerHTML)
      if (elements.giveawayEntriesList) {
        // Clear existing content safely
        while (elements.giveawayEntriesList.firstChild) {
          elements.giveawayEntriesList.removeChild(elements.giveawayEntriesList.firstChild);
        }

        if (response.entries && response.entries.length > 0) {
          const sortedEntries = response.entries
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 20);

          // Build entries using safe DOM construction
          for (const entry of sortedEntries) {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-item';

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'entry-username';
            usernameSpan.textContent = sanitizeUsername(entry.username);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'entry-time';
            timeSpan.textContent = formatTime(entry.timestamp);

            entryDiv.appendChild(usernameSpan);
            entryDiv.appendChild(timeSpan);
            elements.giveawayEntriesList.appendChild(entryDiv);
          }
        } else {
          const emptyMsg = document.createElement('p');
          emptyMsg.className = 'empty-entries';
          emptyMsg.textContent = 'No entries yet. Entries will appear here when viewers type your keywords.';
          elements.giveawayEntriesList.appendChild(emptyMsg);
        }
      }
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load giveaway data:', error);
  }
}

// Load chat metrics from content script
export async function loadChatMetrics() {
  try {
    const response = await new Promise((resolve) => {
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          browserAPI.tabs.sendMessage(tabs[0].id, { type: 'GET_CHAT_METRICS' })
            .then(resolve)
            .catch(() => resolve({ success: false }));
        } else {
          resolve({ success: false });
        }
      });
    });

    if (response?.success && response.metrics) {
      updateMetricsDisplay(response.metrics);
    }
  } catch (error) {
    console.error('[BuzzChat] Failed to load chat metrics:', error);
  }
}

// Update metrics display
export function updateMetricsDisplay(metrics) {
  if (elements.metricMessagesPerMin) {
    elements.metricMessagesPerMin.textContent = metrics.messagesPerMinute || 0;
  }
  if (elements.metricUniqueChatters) {
    elements.metricUniqueChatters.textContent = metrics.uniqueChatters || 0;
  }
  if (elements.metricPeakMsgs) {
    elements.metricPeakMsgs.textContent = metrics.peakMessagesPerMinute || 0;
  }
}
