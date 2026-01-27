// BuzzChat - Popup Utility Functions
// Common utility functions for popup

import { VALIDATION } from './config.js';
import { Toast } from '../ui/toast.js';

// Debounce function for input handlers
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Validate and truncate text input
export function validateText(text, maxLength = VALIDATION.MAX_MESSAGE_LENGTH) {
  if (!text) return '';
  const trimmed = text.trim();
  if (trimmed.length > maxLength) {
    Toast.warning(`Text truncated to ${maxLength} characters`);
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

// Validate number input within range
export function validateNumber(value, min, max, defaultValue) {
  const num = parseInt(value, 10);
  if (isNaN(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
}

// Sanitize username to prevent injection (whitelist approach)
export function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  return String(username)
    .slice(0, 50)
    .replace(/[^a-zA-Z0-9_\- ]/g, '');
}

// Format timestamp for display
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Format account creation date
export function formatAccountDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 86400000) return 'today';
  if (diff < 172800000) return 'yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

  return date.toLocaleDateString();
}
