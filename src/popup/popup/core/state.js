// BuzzChat - Popup State Management
// Global state variables for popup

import { DEFAULT_SETTINGS } from './config.js';

// Current settings state
export let settings = { ...DEFAULT_SETTINGS };

// Update settings reference
export function setSettings(newSettings) {
  settings = newSettings;
}

// Merge settings
export function mergeSettings(updates) {
  settings = { ...settings, ...updates };
}

// Whether using AccountManager (Business tier)
export let useAccountManager = false;

export function setUseAccountManager(value) {
  useAccountManager = value;
}

// Store current giveaway winners for announce/reroll
export let currentWinners = [];
export let giveawayEntries = [];

export function setCurrentWinners(winners) {
  currentWinners = winners;
}

export function setGiveawayEntries(entries) {
  giveawayEntries = entries;
}
