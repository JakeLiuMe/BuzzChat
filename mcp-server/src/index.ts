#!/usr/bin/env node
/**
 * BuzzChat MCP Server
 *
 * Exposes BuzzChat Chrome extension configuration as AI-accessible tools
 * through the Model Context Protocol (MCP).
 *
 * Communication flow:
 * AI Assistant → MCP Server → Native Messaging → Chrome Extension → Chrome Storage
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { NativeMessagingBridge } from "./bridge.js";
import { welcomeTools, handleWelcomeTool } from "./tools/welcome.js";
import { faqTools, handleFaqTool } from "./tools/faq.js";
import { timerTools, handleTimerTool } from "./tools/timer.js";
import { templateTools, handleTemplateTool } from "./tools/templates.js";
import { moderationTools, handleModerationTool } from "./tools/moderation.js";
import { giveawayTools, handleGiveawayTool } from "./tools/giveaway.js";
import { analyticsTools, handleAnalyticsTool } from "./tools/analytics.js";

// Initialize native messaging bridge
const bridge = new NativeMessagingBridge();

// Authentication helper
async function checkAuth(): Promise<{ authenticated: boolean; error?: string }> {
  // Check if API key is required (Business tier)
  const authRequired = await bridge.isAuthRequired();

  if (!authRequired) {
    // Non-Business tier doesn't require API key
    return { authenticated: true };
  }

  // Validate API key for Business tier
  const validation = await bridge.validateApiKey();
  if (!validation.valid) {
    return {
      authenticated: false,
      error: validation.reason || "Invalid API key",
    };
  }

  return { authenticated: true };
}

// Core tools for bot status and settings
const coreTools: Tool[] = [
  {
    name: "get_status",
    description: "Get the current status of the BuzzChat bot including whether it's enabled, the user's tier (free/pro/business), and basic stats",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "enable_bot",
    description: "Enable/activate the BuzzChat bot. The bot must be enabled for any automation features to work.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "disable_bot",
    description: "Disable/deactivate the BuzzChat bot. This stops all automation features until re-enabled.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_all_settings",
    description: "Export the full BuzzChat configuration including welcome messages, FAQ rules, timer messages, templates, and moderation settings",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// Combine all tools
const allTools: Tool[] = [
  ...coreTools,
  ...welcomeTools,
  ...faqTools,
  ...timerTools,
  ...templateTools,
  ...moderationTools,
  ...giveawayTools,
  ...analyticsTools,
];

// Create MCP server
const server = new Server(
  {
    name: "buzzchat-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Check authentication for all tool calls
  const auth = await checkAuth();
  if (!auth.authenticated) {
    return {
      content: [
        {
          type: "text",
          text: `Authentication failed: ${auth.error}. Please provide a valid API key via BUZZCHAT_API_KEY environment variable.`,
        },
      ],
      isError: true,
    };
  }

  try {
    // Core tools
    if (name === "get_status") {
      const settings = await bridge.getSettings();
      const license = await bridge.getLicense();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              enabled: settings?.masterEnabled ?? false,
              tier: license?.tier ?? "free",
              paid: license?.paid ?? false,
              trialActive: license?.trialActive ?? false,
              messagesUsed: settings?.messagesUsed ?? 0,
              messagesLimit: settings?.messagesLimit ?? 25,
              welcomeEnabled: settings?.welcome?.enabled ?? false,
              faqEnabled: settings?.faq?.enabled ?? false,
              timerEnabled: settings?.timer?.enabled ?? false,
            }, null, 2),
          },
        ],
      };
    }

    if (name === "enable_bot") {
      await bridge.updateSettings({ masterEnabled: true });
      return {
        content: [
          {
            type: "text",
            text: "BuzzChat bot has been enabled. Automation features are now active.",
          },
        ],
      };
    }

    if (name === "disable_bot") {
      await bridge.updateSettings({ masterEnabled: false });
      return {
        content: [
          {
            type: "text",
            text: "BuzzChat bot has been disabled. All automation features are now paused.",
          },
        ],
      };
    }

    if (name === "get_all_settings") {
      const settings = await bridge.getSettings();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(settings, null, 2),
          },
        ],
      };
    }

    // Welcome tools
    if (name.startsWith("set_welcome") || name.startsWith("get_welcome")) {
      return handleWelcomeTool(name, args, bridge);
    }

    // FAQ tools
    if (name.includes("faq")) {
      return handleFaqTool(name, args, bridge);
    }

    // Timer tools
    if (name.includes("timer")) {
      return handleTimerTool(name, args, bridge);
    }

    // Template tools
    if (name.includes("template")) {
      return handleTemplateTool(name, args, bridge);
    }

    // Moderation tools
    if (name.includes("blocked") || name.includes("repeat")) {
      return handleModerationTool(name, args, bridge);
    }

    // Giveaway tools
    if (name.includes("giveaway")) {
      return handleGiveawayTool(name, args, bridge);
    }

    // Analytics tools
    if (name.includes("analytics")) {
      return handleAnalyticsTool(name, args, bridge);
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing ${name}: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("BuzzChat MCP server started");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
