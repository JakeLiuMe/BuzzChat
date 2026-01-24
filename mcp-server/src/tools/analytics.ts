/**
 * Analytics Tools
 *
 * MCP tools for accessing BuzzChat usage analytics and performance stats.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const analyticsTools: Tool[] = [
  {
    name: "get_analytics",
    description: "Get BuzzChat performance statistics including messages sent, feature usage, and activity streaks",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_daily_stats",
    description: "Get statistics for a specific day or date range",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
        days: {
          type: "number",
          description: "Number of days to include (default: 1, max: 30)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_message_count",
    description: "Get the total number of messages sent and remaining in the current billing period",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "reset_analytics",
    description: "Clear all analytics data (use with caution)",
    inputSchema: {
      type: "object",
      properties: {
        confirm: {
          type: "boolean",
          description: "Must be true to confirm the reset",
        },
      },
      required: ["confirm"],
    },
  },
];

export async function handleAnalyticsTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  if (name === "get_analytics") {
    const analytics = await bridge.getAnalytics();
    const settings = await bridge.getSettings();

    const stats = {
      totalMessagesSent: analytics.totalMessagesSent,
      activeStreak: analytics.activeStreak,
      currentPeriod: {
        messagesUsed: settings.messagesUsed,
        messagesLimit: settings.messagesLimit,
        remaining: Math.max(0, settings.messagesLimit - settings.messagesUsed),
      },
      features: {
        welcomeEnabled: settings.welcome.enabled,
        faqEnabled: settings.faq.enabled,
        faqRulesCount: settings.faq.rules.length,
        timerEnabled: settings.timer.enabled,
        timerMessagesCount: settings.timer.messages.length,
        templatesCount: settings.templates.length,
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(stats, null, 2),
        },
      ],
    };
  }

  if (name === "get_daily_stats") {
    const analytics = await bridge.getAnalytics();
    const dateStr = args?.date as string;
    const days = Math.min((args?.days as number) ?? 1, 30);

    const today = new Date();
    const startDate = dateStr ? new Date(dateStr) : today;

    const results: Record<string, unknown> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split("T")[0];

      const dayStats = analytics.dailyStats[key];
      if (dayStats) {
        results[key] = dayStats;
      } else {
        results[key] = {
          messagesTotal: 0,
          welcomeMessages: 0,
          faqReplies: 0,
          timerMessages: 0,
        };
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  if (name === "get_message_count") {
    const settings = await bridge.getSettings();

    const used = settings.messagesUsed;
    const limit = settings.messagesLimit;
    const remaining = Math.max(0, limit - used);
    const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;

    let status = "Good";
    if (percentUsed >= 90) {
      status = "Critical - almost at limit!";
    } else if (percentUsed >= 75) {
      status = "Warning - running low";
    }

    return {
      content: [
        {
          type: "text",
          text: `Message Usage:\n\nUsed: ${used}\nLimit: ${limit === Infinity ? "Unlimited" : limit}\nRemaining: ${limit === Infinity ? "Unlimited" : remaining}\nUsage: ${percentUsed}%\nStatus: ${status}`,
        },
      ],
    };
  }

  if (name === "reset_analytics") {
    const confirm = args?.confirm as boolean;

    if (!confirm) {
      return {
        content: [
          {
            type: "text",
            text: "Error: You must set confirm: true to reset analytics. This action cannot be undone.",
          },
        ],
        isError: true,
      };
    }

    await bridge.updateAnalytics({
      dailyStats: {},
      totalMessagesSent: 0,
      activeStreak: 0,
    });

    return {
      content: [
        {
          type: "text",
          text: "Analytics data has been reset.",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown analytics tool: ${name}`,
      },
    ],
    isError: true,
  };
}
