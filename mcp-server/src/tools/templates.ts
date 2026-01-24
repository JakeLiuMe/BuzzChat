/**
 * Template Tools
 *
 * MCP tools for managing quick-reply templates in BuzzChat.
 * Templates are pre-written messages that can be quickly inserted during streams.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const templateTools: Tool[] = [
  {
    name: "add_template",
    description: "Add a quick-reply template for frequently used messages. Templates appear in the extension popup for easy access during streams.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "A short name for the template (e.g., 'Shipping Info', 'Bundle Deal')",
        },
        text: {
          type: "string",
          description: "The full message text for this template",
        },
      },
      required: ["name", "text"],
    },
  },
  {
    name: "list_templates",
    description: "Get all saved quick-reply templates",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "remove_template",
    description: "Remove a template by its index (0-based). Use list_templates first to see the indices.",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "The index of the template to remove (0-based)",
        },
      },
      required: ["index"],
    },
  },
  {
    name: "clear_templates",
    description: "Remove all quick-reply templates",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "update_template",
    description: "Update an existing template's name or text",
    inputSchema: {
      type: "object",
      properties: {
        index: {
          type: "number",
          description: "The index of the template to update (0-based)",
        },
        name: {
          type: "string",
          description: "New name for the template (optional)",
        },
        text: {
          type: "string",
          description: "New text for the template (optional)",
        },
      },
      required: ["index"],
    },
  },
];

export async function handleTemplateTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  const settings = await bridge.getSettings();

  if (name === "add_template") {
    const templateName = args?.name as string;
    const text = args?.text as string;

    if (!templateName) {
      return {
        content: [
          {
            type: "text",
            text: "Error: name parameter is required",
          },
        ],
        isError: true,
      };
    }

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

    const newTemplate = { name: templateName, text };
    const templates = [...settings.templates, newTemplate];

    await bridge.updateSettings({ templates });

    return {
      content: [
        {
          type: "text",
          text: `Template added successfully!\n\nName: "${templateName}"\nText: "${text}"\n\nTotal templates: ${templates.length}`,
        },
      ],
    };
  }

  if (name === "list_templates") {
    const templates = settings.templates;

    if (templates.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No templates configured. Use add_template to create one.",
          },
        ],
      };
    }

    const templatesText = templates.map((tmpl, index) => {
      return `[${index}] ${tmpl.name}\n    "${tmpl.text}"`;
    }).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `Quick-Reply Templates (${templates.length} total):\n\n${templatesText}`,
        },
      ],
    };
  }

  if (name === "remove_template") {
    const index = args?.index as number;

    if (index === undefined || index < 0 || index >= settings.templates.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid index. Must be between 0 and ${settings.templates.length - 1}`,
          },
        ],
        isError: true,
      };
    }

    const removed = settings.templates[index];
    const templates = settings.templates.filter((_, i) => i !== index);

    await bridge.updateSettings({ templates });

    return {
      content: [
        {
          type: "text",
          text: `Removed template:\nName: "${removed.name}"\nText: "${removed.text}"\n\nRemaining templates: ${templates.length}`,
        },
      ],
    };
  }

  if (name === "clear_templates") {
    await bridge.updateSettings({ templates: [] });

    return {
      content: [
        {
          type: "text",
          text: "All templates have been cleared.",
        },
      ],
    };
  }

  if (name === "update_template") {
    const index = args?.index as number;
    const newName = args?.name as string | undefined;
    const newText = args?.text as string | undefined;

    if (index === undefined || index < 0 || index >= settings.templates.length) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Invalid index. Must be between 0 and ${settings.templates.length - 1}`,
          },
        ],
        isError: true,
      };
    }

    if (!newName && !newText) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Must provide either name or text to update",
          },
        ],
        isError: true,
      };
    }

    const templates = [...settings.templates];
    const old = templates[index];
    templates[index] = {
      name: newName ?? old.name,
      text: newText ?? old.text,
    };

    await bridge.updateSettings({ templates });

    return {
      content: [
        {
          type: "text",
          text: `Template updated!\n\nOld: "${old.name}" - "${old.text}"\nNew: "${templates[index].name}" - "${templates[index].text}"`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown template tool: ${name}`,
      },
    ],
    isError: true,
  };
}
