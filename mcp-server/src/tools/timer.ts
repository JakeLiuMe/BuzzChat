/**
 * Timer Message Tools
 *
 * MCP tools for configuring BuzzChat's timed/scheduled messages.
 * Timer messages are sent automatically at regular intervals during streams.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const timerTools: Tool[] = [
  {
    name: "add_timer_message",
    description: "Add a timed message that will be sent automatically at regular intervals. Great for reminders about shipping, promotions, follow reminders, etc.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The message text to send periodically",
        },
        interval: {
          type: "number",
          description: "Interval in minutes between messages (e.g., 5 = every 5 minutes)",
        },
      },
      required: ["text", "interval"],
    },
  },
  {
    name: "list_timer_messages",
    description: "Get all configured timer messages and their intervals",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "remove_timer_message",
    description: "Remove a timer message by its index (0-based). Use list_timer_messages first to see the indices.",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "The index of the timer message to remove (0-based)",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "clear_timer_messages",
    description: "Remove all timer messages",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "enable_timer",
    description: "Enable or disable the timer messages feature",
    inputSchema: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "Whether to enable timer messages",
        },
      },
      required: ["enabled"],
    },
  },
];

export async function handleTimerTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  const settings = await bridge.getSettings();

  if (name === "add_timer_message") {
    const text = args?.text as string;
    const interval = args?.interval as number;

    if (!text) {
      return {
        content: [
          {
            type: "text",
            text: "Error: text parameter is required",
          },
        ],
        isError: true,
      };
    }

    if (!interval || interval <= 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: interval must be a positive number (minutes)",
          },
        ],
        isError: true,
      };
    }

    const newMessage = { text, interval };
    const messages = [...settings.timer.messages, newMessage];

    await bridge.updateSettings({
      timer: {
        ...settings.timer,
        messages,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Timer message added successfully!\n\nMessage: "${text}"\nInterval: every ${interval} minutes\n\nTotal timer messages: ${messages.length}`,
        },
      ],
    };
  }

  if (name === "list_timer_messages") {
    const messages = settings.timer.messages;

    if (messages.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No timer messages configured. Use add_timer_message to create one.",
          },
        ],
      };
    }

    const messagesText = messages.map((msg, index) => {
      return `[${index}] Every ${msg.interval} min: "${msg.text}"`;
    }).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Timer Messages (${messages.length} total):\nEnabled: ${settings.timer.enabled}\n\n${messagesText}`,
        },
      ],
    };
  }

  if (name === "remove_timer_message") {
    const index = args?.index as number;

    if (index === undefined || index < 0 || index >= settings.timer.messages.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid index. Must be between 0 and ${settings.timer.messages.length - 1}`,
          },
        ],
        isError: true,
      };
    }

    const removed = settings.timer.messages[index];
    const messages = settings.timer.messages.filter((_, i) => i !== index);

    await bridge.updateSettings({
      timer: {
        ...settings.timer,
        messages,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Removed timer message:\n"${removed.text}" (every ${removed.interval} min)\n\nRemaining messages: ${messages.length}`,
        },
      ],
    };
  }

  if (name === "clear_timer_messages") {
    await bridge.updateSettings({
      timer: {
        ...settings.timer,
        messages: [],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: "All timer messages have been cleared.",
        },
      ],
    };
  }

  if (name === "enable_timer") {
    const enabled = args?.enabled as boolean;

    await bridge.updateSettings({
      timer: {
        ...settings.timer,
        enabled,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Timer messages ${enabled ? "enabled" : "disabled"}.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown timer tool: ${name}`,
      },
    ],
    isError: true,
  };
}
