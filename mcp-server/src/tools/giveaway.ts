/**
 * Giveaway Tools
 *
 * MCP tools for configuring BuzzChat's giveaway tracking feature.
 * Tracks users who type specific keywords to enter giveaways.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const giveawayTools: Tool[] = [
  {
    name: "configure_giveaway",
    description: "Set up giveaway tracking. When users type the keyword(s), they're added to the entry list. Great for 'type ENTER to win' style giveaways.",
    inputSchema: {
      type: "object",
      properties: {
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "Keywords that count as giveaway entries (e.g., ['ENTER', 'enter', 'giveaway'])",
        },
        uniqueOnly: {
          type: "boolean",
          description: "If true, each user can only enter once (default: true)",
        },
      },
      required: ["keywords"],
    },
  },
  {
    name: "get_giveaway_entries",
    description: "Get the list of users who have entered the current giveaway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "reset_giveaway",
    description: "Clear all giveaway entries and start fresh for a new giveaway",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_giveaway_settings",
    description: "Get the current giveaway configuration including keywords and uniqueOnly setting",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "pick_giveaway_winner",
    description: "Randomly select a winner from the current giveaway entries",
    inputSchema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of winners to pick (default: 1)",
        },
      },
      required: [],
    },
  },
  {
    name: "remove_giveaway_entry",
    description: "Remove a specific user from the giveaway entries (e.g., if they won already)",
    inputSchema: {
      type: "object",
      properties: {
        username: {
          type: "string",
          description: "The username to remove from entries",
        },
      },
      required: ["username"],
    },
  },
];

export async function handleGiveawayTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  const settings = await bridge.getSettings();
  const giveaway = settings.giveaway ?? {
    keywords: [],
    uniqueOnly: true,
    entries: [],
  };

  if (name === "configure_giveaway") {
    const keywords = args?.keywords as string[];
    const uniqueOnly = (args?.uniqueOnly as boolean) ?? true;

    if (!keywords || keywords.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: keywords array is required and must have at least one keyword",
          },
        ],
        isError: true,
      };
    }

    await bridge.updateSettings({
      giveaway: {
        ...giveaway,
        keywords,
        uniqueOnly,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Giveaway configured!\n\nKeywords: ${keywords.join(", ")}\nUnique entries only: ${uniqueOnly}\n\nUsers typing any of these keywords will be tracked as giveaway entries.`,
        },
      ],
    };
  }

  if (name === "get_giveaway_entries") {
    const entries = giveaway.entries;

    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No giveaway entries yet. Make sure giveaway is configured with keywords.",
          },
        ],
      };
    }

    const entriesList = entries.map((entry, index) => {
      const date = new Date(entry.timestamp);
      return `${index + 1}. ${entry.username} (${date.toLocaleTimeString()})`;
    }).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Giveaway Entries (${entries.length} total):\n\n${entriesList}`,
        },
      ],
    };
  }

  if (name === "reset_giveaway") {
    await bridge.updateSettings({
      giveaway: {
        ...giveaway,
        entries: [],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: "Giveaway entries have been cleared. Ready for a new giveaway!",
        },
      ],
    };
  }

  if (name === "get_giveaway_settings") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            keywords: giveaway.keywords,
            uniqueOnly: giveaway.uniqueOnly,
            entryCount: giveaway.entries.length,
          }, null, 2),
        },
      ],
    };
  }

  if (name === "pick_giveaway_winner") {
    const count = (args?.count as number) ?? 1;
    const entries = giveaway.entries;

    if (entries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No entries to pick from! The giveaway has no participants yet.",
          },
        ],
      };
    }

    if (count > entries.length) {
      return {
        content: [
          {
            type: "text",
            text: `Cannot pick ${count} winners from ${entries.length} entries. Reduce the count or wait for more entries.`,
          },
        ],
        isError: true,
      };
    }

    // Shuffle and pick winners
    const shuffled = [...entries].sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, count);

    const winnersText = winners.map((w, i) => `${i + 1}. ${w.username}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `🎉 Giveaway Winner${count > 1 ? "s" : ""}!\n\n${winnersText}\n\nPicked from ${entries.length} total entries.`,
        },
      ],
    };
  }

  if (name === "remove_giveaway_entry") {
    const username = args?.username as string;

    if (!username) {
      return {
        content: [
          {
            type: "text",
            text: "Error: username parameter is required",
          },
        ],
        isError: true,
      };
    }

    const lowerUsername = username.toLowerCase();
    const entries = giveaway.entries.filter(
      e => e.username.toLowerCase() !== lowerUsername
    );

    if (entries.length === giveaway.entries.length) {
      return {
        content: [
          {
            type: "text",
            text: `User "${username}" was not found in the giveaway entries.`,
          },
        ],
      };
    }

    await bridge.updateSettings({
      giveaway: {
        ...giveaway,
        entries,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Removed "${username}" from giveaway entries.\n\nRemaining entries: ${entries.length}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown giveaway tool: ${name}`,
      },
    ],
    isError: true,
  };
}
