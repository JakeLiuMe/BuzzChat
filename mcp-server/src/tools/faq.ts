/**
 * FAQ Auto-Reply Tools
 *
 * MCP tools for configuring BuzzChat's FAQ auto-reply feature.
 * FAQ rules automatically respond when viewers ask common questions.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const faqTools: Tool[] = [
  {
    name: "add_faq_rule",
    description: "Add an FAQ auto-reply rule. When any trigger word is detected in chat, the bot automatically sends the reply. Great for answering common questions about shipping, payments, returns, etc.",
    inputSchema: {
      type: "object",
      properties: {
        triggers: {
          type: "array",
          items: { type: "string" },
          description: "List of trigger words/phrases that will activate this auto-reply. Example: ['shipping', 'ship', 'deliver', 'delivery']",
        },
        reply: {
          type: "string",
          description: "The automatic reply message to send when a trigger is detected",
        },
        caseSensitive: {
          type: "boolean",
          description: "Whether trigger matching should be case-sensitive (default: false)",
        },
      },
      required: ["triggers", "reply"],
    },
  },
  {
    name: "list_faq_rules",
    description: "Get all configured FAQ auto-reply rules",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "remove_faq_rule",
    description: "Remove an FAQ rule by its index (0-based). Use list_faq_rules first to see the indices.",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "The index of the rule to remove (0-based)",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "clear_faq_rules",
    description: "Remove all FAQ auto-reply rules",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "enable_faq",
    description: "Enable or disable the FAQ auto-reply feature",
    inputSchema: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "Whether to enable FAQ auto-replies",
        },
      },
      required: ["enabled"],
    },
  },
];

export async function handleFaqTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  const settings = await bridge.getSettings();

  if (name === "add_faq_rule") {
    const triggers = args?.triggers as string[];
    const reply = args?.reply as string;
    const caseSensitive = (args?.caseSensitive as boolean) ?? false;

    if (!triggers || triggers.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Error: triggers array is required and must have at least one trigger",
          },
        ],
        isError: true,
      };
    }

    if (!reply) {
      return {
        content: [
          {
            type: "text",
            text: "Error: reply parameter is required",
          },
        ],
        isError: true,
      };
    }

    const newRule = { triggers, reply, caseSensitive };
    const rules = [...settings.faq.rules, newRule];

    await bridge.updateSettings({
      faq: {
        ...settings.faq,
        rules,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `FAQ rule added successfully!\n\nTriggers: ${triggers.join(", ")}\nReply: "${reply}"\nCase sensitive: ${caseSensitive}\n\nTotal rules: ${rules.length}`,
        },
      ],
    };
  }

  if (name === "list_faq_rules") {
    const rules = settings.faq.rules;

    if (rules.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No FAQ rules configured. Use add_faq_rule to create one.",
          },
        ],
      };
    }

    const rulesText = rules.map((rule, index) => {
      return `[${index}] Triggers: ${rule.triggers.join(", ")}\n    Reply: "${rule.reply}"\n    Case sensitive: ${rule.caseSensitive}`;
    }).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `FAQ Auto-Reply Rules (${rules.length} total):\nEnabled: ${settings.faq.enabled}\n\n${rulesText}`,
        },
      ],
    };
  }

  if (name === "remove_faq_rule") {
    const index = args?.index as number;

    if (index === undefined || index < 0 || index >= settings.faq.rules.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid index. Must be between 0 and ${settings.faq.rules.length - 1}`,
          },
        ],
        isError: true,
      };
    }

    const removed = settings.faq.rules[index];
    const rules = settings.faq.rules.filter((_, i) => i !== index);

    await bridge.updateSettings({
      faq: {
        ...settings.faq,
        rules,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Removed FAQ rule:\nTriggers: ${removed.triggers.join(", ")}\nReply: "${removed.reply}"\n\nRemaining rules: ${rules.length}`,
        },
      ],
    };
  }

  if (name === "clear_faq_rules") {
    await bridge.updateSettings({
      faq: {
        ...settings.faq,
        rules: [],
      },
    });

    return {
      content: [
        {
          type: "text",
          text: "All FAQ rules have been cleared.",
        },
      ],
    };
  }

  if (name === "enable_faq") {
    const enabled = args?.enabled as boolean;

    await bridge.updateSettings({
      faq: {
        ...settings.faq,
        enabled,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `FAQ auto-replies ${enabled ? "enabled" : "disabled"}.`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown FAQ tool: ${name}`,
      },
    ],
    isError: true,
  };
}
