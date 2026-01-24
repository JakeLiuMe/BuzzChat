/**
 * Native Messaging Bridge
 *
 * Handles communication between the MCP server and the BuzzChat Chrome extension
 * using Chrome Native Messaging protocol.
 *
 * The bridge can operate in two modes:
 * 1. Native Messaging mode - communicates directly with Chrome extension (production)
 * 2. File-based mode - uses a JSON file for settings (development/testing)
 */

import * as fs from "fs";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

export interface BuzzChatSettings {
  tier: string;
  messagesUsed: number;
  messagesLimit: number;
  referralBonus: number;
  masterEnabled: boolean;
  welcome: {
    enabled: boolean;
    message: string;
    delay: number;
  };
  timer: {
    enabled: boolean;
    messages: Array<{
      text: string;
      interval: number;
      lastSent?: number;
    }>;
  };
  faq: {
    enabled: boolean;
    rules: Array<{
      triggers: string[];
      reply: string;
      caseSensitive: boolean;
    }>;
  };
  templates: Array<{
    name: string;
    text: string;
  }>;
  moderation?: {
    blockedWords: string[];
    repeatBlocking: {
      enabled: boolean;
      maxCount: number;
    };
  };
  giveaway?: {
    keywords: string[];
    uniqueOnly: boolean;
    entries: Array<{
      username: string;
      timestamp: number;
    }>;
  };
  settings: {
    chatSelector: string;
    soundNotifications: boolean;
    showMessageCount: boolean;
  };
}

export interface BuzzChatLicense {
  tier: string;
  paid: boolean;
  trialActive: boolean;
  trialEndsAt?: string;
  email?: string;
  customerId?: string;
  cachedAt?: number;
}

export interface ApiKeyData {
  id: string;
  name: string;
  key: string;
  createdAt: number;
  lastUsed: number | null;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  keyId?: string;
  name?: string;
  reason?: string;
}

export interface BuzzChatAnalytics {
  dailyStats: Record<string, {
    messagesTotal: number;
    welcomeMessages: number;
    faqReplies: number;
    timerMessages: number;
  }>;
  totalMessagesSent: number;
  activeStreak: number;
}

// Default settings for development/testing
const DEFAULT_SETTINGS: BuzzChatSettings = {
  tier: "free",
  messagesUsed: 0,
  messagesLimit: 25,
  referralBonus: 0,
  masterEnabled: false,
  welcome: {
    enabled: false,
    message: "Hey {username}! Welcome to the stream!",
    delay: 5,
  },
  timer: {
    enabled: false,
    messages: [],
  },
  faq: {
    enabled: false,
    rules: [],
  },
  templates: [],
  moderation: {
    blockedWords: [],
    repeatBlocking: {
      enabled: false,
      maxCount: 3,
    },
  },
  giveaway: {
    keywords: [],
    uniqueOnly: true,
    entries: [],
  },
  settings: {
    chatSelector: "",
    soundNotifications: true,
    showMessageCount: true,
  },
};

export class NativeMessagingBridge {
  private settingsPath: string;
  private analyticsPath: string;
  private apiKeysPath: string;
  private nativeHost: ChildProcess | null = null;
  private useNativeMessaging: boolean = false;
  private apiKey: string | null = null;

  constructor() {
    // Use a config directory in user's home for development
    const configDir = process.env.BUZZCHAT_CONFIG_DIR ||
      path.join(process.env.HOME || process.env.USERPROFILE || ".", ".buzzchat");

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    this.settingsPath = path.join(configDir, "settings.json");
    this.analyticsPath = path.join(configDir, "analytics.json");
    this.apiKeysPath = path.join(configDir, "api-keys.json");

    // Check if native messaging is available
    this.useNativeMessaging = this.checkNativeMessaging();

    // Load API key from environment variable
    this.apiKey = process.env.BUZZCHAT_API_KEY || null;
  }

  // Set the API key (used when provided via environment or config)
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  // Validate the current API key
  async validateApiKey(): Promise<ApiKeyValidationResult> {
    if (!this.apiKey) {
      return { valid: false, reason: "No API key provided" };
    }

    const KEY_PREFIX = "bz_live_";
    if (!this.apiKey.startsWith(KEY_PREFIX)) {
      return { valid: false, reason: "Invalid key format" };
    }

    const keys = this.getApiKeysFromFile();
    for (const keyId in keys) {
      if (keys[keyId].key === this.apiKey) {
        // Update last used timestamp
        keys[keyId].lastUsed = Date.now();
        this.saveApiKeysToFile(keys);

        return {
          valid: true,
          keyId,
          name: keys[keyId].name,
        };
      }
    }

    return { valid: false, reason: "API key not found" };
  }

  // Check if authentication is required (Business tier only)
  async isAuthRequired(): Promise<boolean> {
    const license = await this.getLicense();
    return license.tier === "business";
  }

  // Get API keys from file
  private getApiKeysFromFile(): Record<string, ApiKeyData> {
    try {
      if (fs.existsSync(this.apiKeysPath)) {
        const data = fs.readFileSync(this.apiKeysPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading API keys file:", error);
    }
    return {};
  }

  // Save API keys to file
  private saveApiKeysToFile(keys: Record<string, ApiKeyData>): void {
    fs.writeFileSync(this.apiKeysPath, JSON.stringify(keys, null, 2));
  }

  private checkNativeMessaging(): boolean {
    // Check if the native messaging host is installed
    // For now, we'll use file-based mode for development
    // Native messaging will be enabled when the host is properly installed
    return false;
  }

  async getSettings(): Promise<BuzzChatSettings> {
    if (this.useNativeMessaging) {
      return this.sendNativeMessage({ type: "GET_SETTINGS" });
    }

    return this.getSettingsFromFile();
  }

  async updateSettings(updates: Partial<BuzzChatSettings>): Promise<void> {
    if (this.useNativeMessaging) {
      await this.sendNativeMessage({ type: "UPDATE_SETTINGS", data: updates });
      return;
    }

    const current = await this.getSettingsFromFile();
    const updated = this.deepMerge(current, updates);
    this.saveSettingsToFile(updated);
  }

  async getLicense(): Promise<BuzzChatLicense> {
    if (this.useNativeMessaging) {
      return this.sendNativeMessage({ type: "GET_LICENSE" });
    }

    // In file mode, return a mock license based on settings
    const settings = await this.getSettings();
    return {
      tier: settings.tier,
      paid: settings.tier !== "free",
      trialActive: false,
    };
  }

  async getAnalytics(): Promise<BuzzChatAnalytics> {
    if (this.useNativeMessaging) {
      return this.sendNativeMessage({ type: "GET_ANALYTICS" });
    }

    return this.getAnalyticsFromFile();
  }

  async updateAnalytics(updates: Partial<BuzzChatAnalytics>): Promise<void> {
    if (this.useNativeMessaging) {
      await this.sendNativeMessage({ type: "UPDATE_ANALYTICS", data: updates });
      return;
    }

    const current = await this.getAnalyticsFromFile();
    const updated = this.deepMerge(current, updates);
    this.saveAnalyticsToFile(updated);
  }

  // File-based operations for development/testing

  private getSettingsFromFile(): BuzzChatSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading settings file:", error);
    }

    // Initialize with defaults
    this.saveSettingsToFile(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  private saveSettingsToFile(settings: BuzzChatSettings): void {
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  private getAnalyticsFromFile(): BuzzChatAnalytics {
    try {
      if (fs.existsSync(this.analyticsPath)) {
        const data = fs.readFileSync(this.analyticsPath, "utf-8");
        return JSON.parse(data);
      }
    } catch (error) {
      console.error("Error reading analytics file:", error);
    }

    const defaults: BuzzChatAnalytics = {
      dailyStats: {},
      totalMessagesSent: 0,
      activeStreak: 0,
    };
    this.saveAnalyticsToFile(defaults);
    return defaults;
  }

  private saveAnalyticsToFile(analytics: BuzzChatAnalytics): void {
    fs.writeFileSync(this.analyticsPath, JSON.stringify(analytics, null, 2));
  }

  // Native messaging operations

  private async sendNativeMessage<T>(message: object): Promise<T> {
    return new Promise((resolve, reject) => {
      // This would connect to the native messaging host
      // For now, we'll reject as native messaging isn't implemented
      reject(new Error("Native messaging not available. Using file-based mode."));
    });
  }

  // Utility functions

  private deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        (result as any)[key] = this.deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        (result as any)[key] = sourceValue;
      }
    }

    return result;
  }
}
