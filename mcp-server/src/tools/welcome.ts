/**
 * Welcome Message Tools
 *
 * MCP tools for configuring BuzzChat's auto-welcome feature.
 * Auto-welcome greets new viewers when they first chat in the stream.
 */

import { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { NativeMessagingBridge } from "../bridge.js";

export const welcomeTools: Tool[] = [
  {
    name: "set_welcome_message",
    description: "Configure the auto-welcome message that greets new viewers. Use {username} as a placeholder for the viewer's name. Example: 'Hey {username}! Welcome to my stream!'",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The welcome message text. Use {username} to insert the viewer's name.",
        },
        delay: {
          type: "number",
          description: "Delay in seconds before sending the welcome message (default: 5). This prevents spam when multiple people join at once.",
        },
        enabled: {
          type: "boolean",
          description: "Whether to enable the auto-welcome feature (default: true when setting a message)",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "get_welcome_settings",
    description: "Get the current auto-welcome configuration including the message, delay, and enabled status",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

export async function handleWelcomeTool(
  name: string,
  args: Record<string, unknown> | undefined,
  bridge: NativeMessagingBridge
): Promise<CallToolResult> {
  if (name === "set_welcome_message") {
    const message = args?.message as string;
    const delay = (args?.delay as number) ?? 5;
    const enabled = (args?.enabled as boolean) ?? true;

    if (!message) {
      return {
        content: [
          {
            type: "text",
            text: "Error: message parameter is required",
          },
        ],
        isError: true,
      };
    }

    await bridge.updateSettings({
      welcome: {
        enabled,
        message,
        delay,
      },
    });

    return {
      content: [
        {
          type: "text",
          text: `Welcome message configured successfully!\n\nMessage: "${message}"\nDelay: ${delay} seconds\nEnabled: ${enabled}\n\nNew viewers will be greeted automatically when they chat.`,
        },
      ],
    };
  }

  if (name === "get_welcome_settings") {
    const settings = await bridge.getSettings();
    const welcome = settings.welcome;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            enabled: welcome.enabled,
            message: welcome.message,
            delay: welcome.delay,
          }, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown welcome tool: ${name}`,
      },
    ],
    isError: true,
  };
}
