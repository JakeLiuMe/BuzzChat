// BuzzChat - AI-Powered Chat Translation
// Translate messages between buyers and sellers using Claude Haiku

import { browserAPI } from '../core/config.js';

// Storage keys
const STORAGE_KEYS = {
  TRANSLATION_CACHE: 'buzzchatTranslationCache',
  TRANSLATION_SETTINGS: 'buzzchatTranslationSettings'
};

// Language codes with display names
const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  ar: 'Arabic',
  hi: 'Hindi',
  vi: 'Vietnamese',
  th: 'Thai',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  id: 'Indonesian',
  ms: 'Malay',
  tl: 'Tagalog'
};

// Patterns to skip (don't translate these)
const SKIP_PATTERNS = {
  // Emojis only
  emojiOnly: /^[\p{Emoji}\s]+$/u,
  // Prices like $50, 50$, $50.00
  price: /^\$?\d+(?:\.\d{2})?\$?$/,
  // Username mentions @user
  mention: /^@[\w]+$/,
  // Single words that are likely usernames or product codes
  shortCode: /^[A-Z0-9]{2,6}$/,
  // Numbers only
  numbersOnly: /^\d+$/,
  // Common chat shortcuts
  shortcuts: /^(lol|omg|brb|gtg|ty|tysm|np|gg|gl|hf|ez|rn|imo|tbh|ngl|fr|fyi|btw|afk|dm|pm)$/i
};

/**
 * Check if translation is enabled in settings
 */
export async function isTranslationEnabled() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      const settings = result.buzzchatSettings || {};
      resolve(settings.translation?.enabled ?? false);
    });
  });
}

/**
 * Get translation settings
 */
export async function getTranslationSettings() {
  return new Promise((resolve) => {
    browserAPI.storage.sync.get(['buzzchatSettings'], (result) => {
      const settings = result.buzzchatSettings || {};
      resolve({
        enabled: settings.translation?.enabled ?? false,
        showOriginal: settings.translation?.showOriginal ?? true,
        autoDetect: settings.translation?.autoDetect ?? true,
        sellerLanguage: settings.translation?.sellerLanguage ?? 'en',
        minConfidence: settings.translation?.minConfidence ?? 0.8
      });
    });
  });
}

/**
 * Check if text should be skipped (emojis, usernames, prices, etc.)
 */
export function shouldSkipTranslation(text) {
  if (!text || typeof text !== 'string') return true;
  
  const trimmed = text.trim();
  
  // Skip very short text
  if (trimmed.length < 3) return true;
  
  // Skip if matches any skip pattern
  for (const [_name, pattern] of Object.entries(SKIP_PATTERNS)) {
    if (pattern.test(trimmed)) return true;
  }
  
  // Skip if mostly emojis (>50% emoji)
  const emojiCount = (trimmed.match(/[\p{Emoji}]/gu) || []).length;
  const charCount = [...trimmed].length;
  if (emojiCount > 0 && emojiCount / charCount > 0.5) return true;
  
  return false;
}

/**
 * Detect the language of a text using Claude AI
 * Returns { language: 'es', confidence: 0.95, name: 'Spanish' }
 */
export async function detectLanguage(text) {
  if (shouldSkipTranslation(text)) {
    return { language: 'unknown', confidence: 0, name: 'Unknown', skipped: true };
  }
  
  // Check cache first
  const cached = await getCachedDetection(text);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
  try {
    // Send to background worker for API call
    const result = await browserAPI.runtime.sendMessage({
      type: 'TRANSLATE_MESSAGE',
      payload: {
        action: 'detect',
        text: text.substring(0, 500) // Limit text length
      }
    });
    
    if (result.error) {
      console.warn('[BuzzChat Translation] Detection error:', result.error);
      return { language: 'unknown', confidence: 0, name: 'Unknown', error: result.error };
    }
    
    // Cache the result
    await cacheDetection(text, result);
    
    return {
      language: result.language || 'unknown',
      confidence: result.confidence || 0,
      name: LANGUAGE_NAMES[result.language] || result.language || 'Unknown'
    };
  } catch (error) {
    console.error('[BuzzChat Translation] Detection failed:', error);
    return { language: 'unknown', confidence: 0, name: 'Unknown', error: error.message };
  }
}

/**
 * Translate text to English (for incoming buyer messages)
 * @param {string} text - Text to translate
 * @param {string} fromLang - Source language code (e.g., 'es')
 * @returns {Object} { translated: 'Hello', original: 'Hola', fromLang: 'es' }
 */
export async function translateToEnglish(text, fromLang = null) {
  if (shouldSkipTranslation(text)) {
    return { translated: text, original: text, skipped: true };
  }
  
  // If no source language provided, detect it
  if (!fromLang) {
    const detection = await detectLanguage(text);
    fromLang = detection.language;
    
    // Don't translate if already English or detection failed
    if (fromLang === 'en' || fromLang === 'unknown') {
      return { translated: text, original: text, fromLang, isEnglish: true };
    }
    
    // Skip if confidence is too low
    if (detection.confidence < 0.8) {
      return { translated: text, original: text, fromLang, lowConfidence: true };
    }
  }
  
  // Check cache
  const cacheKey = `${fromLang}:en:${text}`;
  const cached = await getCachedTranslation(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
  try {
    const result = await browserAPI.runtime.sendMessage({
      type: 'TRANSLATE_MESSAGE',
      payload: {
        action: 'translate',
        text: text.substring(0, 500),
        fromLang,
        toLang: 'en'
      }
    });
    
    if (result.error) {
      return { translated: text, original: text, error: result.error };
    }
    
    const translationResult = {
      translated: result.translated || text,
      original: text,
      fromLang,
      fromLangName: LANGUAGE_NAMES[fromLang] || fromLang
    };
    
    // Cache the result
    await cacheTranslation(cacheKey, translationResult);
    
    return translationResult;
  } catch (error) {
    console.error('[BuzzChat Translation] Translation failed:', error);
    return { translated: text, original: text, error: error.message };
  }
}

/**
 * Translate text from English to target language (for seller responses)
 * @param {string} text - English text to translate
 * @param {string} toLang - Target language code (e.g., 'es')
 * @returns {Object} { translated: 'Hola', original: 'Hello', toLang: 'es' }
 */
export async function translateFromEnglish(text, toLang) {
  if (shouldSkipTranslation(text) || !toLang || toLang === 'en') {
    return { translated: text, original: text, skipped: true };
  }
  
  // Check cache
  const cacheKey = `en:${toLang}:${text}`;
  const cached = await getCachedTranslation(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
  try {
    const result = await browserAPI.runtime.sendMessage({
      type: 'TRANSLATE_MESSAGE',
      payload: {
        action: 'translate',
        text: text.substring(0, 500),
        fromLang: 'en',
        toLang
      }
    });
    
    if (result.error) {
      return { translated: text, original: text, error: result.error };
    }
    
    const translationResult = {
      translated: result.translated || text,
      original: text,
      toLang,
      toLangName: LANGUAGE_NAMES[toLang] || toLang
    };
    
    // Cache the result
    await cacheTranslation(cacheKey, translationResult);
    
    return translationResult;
  } catch (error) {
    console.error('[BuzzChat Translation] Translation failed:', error);
    return { translated: text, original: text, error: error.message };
  }
}

/**
 * Format translated message for display
 * Returns: "🌍 Translated from Spanish: [message]"
 */
export function formatTranslatedMessage(result) {
  if (!result || result.skipped || result.isEnglish || result.error) {
    return result?.original || result?.translated || '';
  }
  
  const langName = result.fromLangName || LANGUAGE_NAMES[result.fromLang] || result.fromLang;
  return `🌍 Translated from ${langName}: ${result.translated}`;
}

/**
 * Get language badge HTML for UI
 */
export function getLanguageBadge(langCode, confidence) {
  const langName = LANGUAGE_NAMES[langCode] || langCode;
  const confidenceClass = confidence >= 0.9 ? 'high' : confidence >= 0.8 ? 'medium' : 'low';
  
  return `<span class="translation-badge translation-confidence-${confidenceClass}" 
               title="${langName} (${Math.round(confidence * 100)}% confidence)">
            🌍 ${langCode.toUpperCase()}
          </span>`;
}

// =============================================================================
// CACHING
// =============================================================================

/**
 * Get cached language detection
 */
async function getCachedDetection(text) {
  const key = `detect:${text.substring(0, 100)}`;
  return getCached(key);
}

/**
 * Cache language detection result
 */
async function cacheDetection(text, result) {
  const key = `detect:${text.substring(0, 100)}`;
  return setCache(key, result);
}

/**
 * Get cached translation
 */
async function getCachedTranslation(cacheKey) {
  return getCached(cacheKey);
}

/**
 * Cache translation result
 */
async function cacheTranslation(cacheKey, result) {
  return setCache(cacheKey, result);
}

/**
 * Generic cache getter
 */
async function getCached(key) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.TRANSLATION_CACHE], (result) => {
      const cache = result[STORAGE_KEYS.TRANSLATION_CACHE] || {};
      const entry = cache[key];
      
      // Cache valid for 7 days
      if (entry && (Date.now() - entry.timestamp) < 7 * 24 * 60 * 60 * 1000) {
        resolve(entry.data);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Generic cache setter
 */
async function setCache(key, data) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.TRANSLATION_CACHE], (result) => {
      const cache = result[STORAGE_KEYS.TRANSLATION_CACHE] || {};
      
      // Limit cache size to 1000 entries
      const keys = Object.keys(cache);
      if (keys.length >= 1000) {
        // Remove oldest 200 entries
        const sorted = keys.sort((a, b) => cache[a].timestamp - cache[b].timestamp);
        sorted.slice(0, 200).forEach(k => delete cache[k]);
      }
      
      cache[key] = {
        data,
        timestamp: Date.now()
      };
      
      browserAPI.storage.local.set({ [STORAGE_KEYS.TRANSLATION_CACHE]: cache }, resolve);
    });
  });
}

/**
 * Clear translation cache
 */
export async function clearTranslationCache() {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove([STORAGE_KEYS.TRANSLATION_CACHE], resolve);
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get([STORAGE_KEYS.TRANSLATION_CACHE], (result) => {
      const cache = result[STORAGE_KEYS.TRANSLATION_CACHE] || {};
      const entries = Object.keys(cache);
      
      const detections = entries.filter(k => k.startsWith('detect:')).length;
      const translations = entries.length - detections;
      
      resolve({
        total: entries.length,
        detections,
        translations,
        oldestEntry: entries.length > 0 
          ? new Date(Math.min(...entries.map(k => cache[k].timestamp))).toISOString()
          : null
      });
    });
  });
}

// Export language names for UI
export { LANGUAGE_NAMES };

// Export defaults
export default {
  isTranslationEnabled,
  getTranslationSettings,
  detectLanguage,
  translateToEnglish,
  translateFromEnglish,
  formatTranslatedMessage,
  getLanguageBadge,
  shouldSkipTranslation,
  clearTranslationCache,
  getCacheStats,
  LANGUAGE_NAMES
};
