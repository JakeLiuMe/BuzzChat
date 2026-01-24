/**
 * Moderation Tools
 *
 * MCP tools for configuring BuzzChat's moderation features.
 * Includes word filtering and spam/repeat message blocking.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const moderationTools: Tool[] = [
  {
    name: "set_blocked_words",
    description: "Configure the word filter. Messages containing these words will be flagged or blocked.",
    inputSchema: {
      type: "object",
      properties: {
        words: {
          type: "array",
          items: { type: "string" },
          description: "List of words to block/filter",
        },
      },
      required: ["words"],
    },
  },
  {
    name: "get_blocked_words",
    description: "Get the current list of blocked words",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "add_blocked_word",
    description: "Add a single word to the blocked list",
    inputSchema: {
      type: "object",
      properties: {
        word: {
          type: "string",
          description: "The word to add to the block list",
        },
      },
      required: ["word"],
    },
  },
  {
    name: "remove_blocked_word",
    description: "Remove a word from the blocked list",
    inputSchema: {
      type: "object",
      properties: {
        word: {
          type: "string",
          description: "The word to remove from the block list",
        },
      },
      required: ["word"],
    },
  },
  {
    name: "enable_repeat_blocking",
    description: "Enable spam protection that blocks users from repeating the same message too many times",
    inputSchema: {
      type: "object",
      properties: {
        maxCount: {
          type: "number",
          description: "Maximum number of times a message can be repeated (e.g., 3)",
        },
      },
      required: ["maxCount"],
    },
  },
  {
    name: "disable_repeat_blocking",
    description: "Disable the repeat message spam protection",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_moderation_settings",
    description: "Get all moderation settings including blocked words and repeat blocking configuration",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function handleModerationTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  const settings = await bridge.getSettings();
  const moderation = settings.moderation ?? {
    blockedWords: [],
    repeatBlocking: { enabled: false, maxCount: 3 },
  };

  if (name === "set_blocked_words") {
    const words = args?.words as string[];

    if (!words) {
      return {
        content: [
          {
            type: "text",
            text: "Error: words array is required",
          },
        ],
        isError: true,
      };
    }

    await bridge.updateSettings({
      moderation: {
        ...moderation,
        blockedWords: words,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Blocked words list updated.\n\nTotal blocked words: ${words.length}${words.length > 0 ? `\nWords: ${words.join(", ")}` : ""}`,
        },
      ],
    };
  }

  if (name === "get_blocked_words") {
    const words = moderation.blockedWords;

    if (words.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No blocked words configured.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Blocked Words (${words.length} total):\n${words.join(", ")}`,
        },
      ],
    };
  }

  if (name === "add_blocked_word") {
    const word = args?.word as string;

    if (!word) {
      return {
        content: [
          {
            type: "text",
            text: "Error: word parameter is required",
          },
        ],
        isError: true,
      };
    }

    const lowerWord = word.toLowerCase();
    if (moderation.blockedWords.map(w => w.toLowerCase()).includes(lowerWord)) {
      return {
        content: [
          {
            type: "text",
            text: `"${word}" is already in the blocked words list.`,
          },
        ],
      };
    }

    const words = [...moderation.blockedWords, word];

    await bridge.updateSettings({
      moderation: {
        ...moderation,
        blockedWords: words,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Added "${word}" to blocked words.\n\nTotal blocked words: ${words.length}`,
        },
      ],
    };
  }

  if (name === "remove_blocked_word") {
    const word = args?.word as string;

    if (!word) {
      return {
        content: [
          {
            type: "text",
            text: "Error: word parameter is required",
          },
        ],
        isError: true,
      };
    }

    const lowerWord = word.toLowerCase();
    const words = moderation.blockedWords.filter(w => w.toLowerCase() !== lowerWord);

    if (words.length === moderation.blockedWords.length) {
      return {
        content: [
          {
            type: "text",
            text: `"${word}" was not found in the blocked words list.`,
          },
        ],
      };
    }

    await bridge.updateSettings({
      moderation: {
        ...moderation,
        blockedWords: words,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Removed "${word}" from blocked words.\n\nRemaining blocked words: ${words.length}`,
        },
      ],
    };
  }

  if (name === "enable_repeat_blocking") {
    const maxCount = args?.maxCount as number;

    if (!maxCount || maxCount <= 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: maxCount must be a positive number",
          },
        ],
        isError: true,
      };
    }

    await bridge.updateSettings({
      moderation: {
        ...moderation,
        repeatBlocking: {
          enabled: true,
          maxCount,
        },
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Repeat blocking enabled. Users will be flagged after repeating the same message ${maxCount} times.`,
        },
      ],
    };
  }

  if (name === "disable_repeat_blocking") {
    await bridge.updateSettings({
      moderation: {
        ...moderation,
        repeatBlocking: {
          ...moderation.repeatBlocking,
          enabled: false,
        },
      },
    });

    return {
      content: [
        {
          type: "text",
          text: "Repeat blocking has been disabled.",
        },
      ],
    };
  }

  if (name === "get_moderation_settings") {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            blockedWords: moderation.blockedWords,
            repeatBlocking: moderation.repeatBlocking,
          }, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown moderation tool: ${name}`,
      },
    ],
    isError: true,
  };
}
