#!/usr/bin/env node
/**
 * BuzzChat REST API Server
 *
 * Provides HTTP endpoints for external control of BuzzChat.
 * Requires API key authentication for all endpoints.
 *
 * Default port: 3847 (configurable via BUZZCHAT_REST_PORT)
 *
 * Endpoints:
 * GET  /status              - Bot status, tier, message count
 * POST /bot/enable          - Enable the bot
 * POST /bot/disable         - Disable the bot
 * GET  /settings            - Get all settings
 * PUT  /settings            - Update settings
 * POST /message/send        - Send a chat message (requires active stream)
 * GET  /analytics           - Get analytics data
 */

import * as http from "http";
import * as url from "url";
import { NativeMessagingBridge } from "./bridge.js";

const PORT = parseInt(process.env.BUZZCHAT_REST_PORT || "3847", 10);
const HOST = process.env.BUZZCHAT_REST_HOST || "127.0.0.1"; // Local only by default

// Initialize bridge
const bridge = new NativeMessagingBridge();

// CORS headers for local development
const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

// Parse JSON body from request
async function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Limit body size to 1MB
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// Send JSON response
function sendJson(
  res: http.ServerResponse,
  status: number,
  data: any
): void {
  res.writeHead(status, corsHeaders);
  res.end(JSON.stringify(data, null, 2));
}

// Send error response
function sendError(
  res: http.ServerResponse,
  status: number,
  message: string
): void {
  sendJson(res, status, { error: message });
}

// Extract API key from Authorization header
function extractApiKey(req: http.IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  // Support "Bearer <key>" format
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Also support raw key
  return authHeader;
}

// Authentication middleware
async function authenticate(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<boolean> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    sendError(res, 401, "Missing API key. Use Authorization: Bearer <your-api-key>");
    return false;
  }

  // Set the API key on the bridge for validation
  bridge.setApiKey(apiKey);
  const validation = await bridge.validateApiKey();

  if (!validation.valid) {
    sendError(res, 401, `Invalid API key: ${validation.reason}`);
    return false;
  }

  return true;
}

// Request handler
async function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  const parsedUrl = url.parse(req.url || "/", true);
  const pathname = parsedUrl.pathname || "/";
  const method = req.method || "GET";

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // Health check endpoint (no auth required)
  if (pathname === "/health" && method === "GET") {
    sendJson(res, 200, { status: "ok", version: "1.0.0" });
    return;
  }

  // All other endpoints require authentication
  const authenticated = await authenticate(req, res);
  if (!authenticated) return;

  try {
    // Route handling
    switch (`${method} ${pathname}`) {
      case "GET /status": {
        const settings = await bridge.getSettings();
        const license = await bridge.getLicense();

        sendJson(res, 200, {
          enabled: settings?.masterEnabled ?? false,
          tier: license?.tier ?? "free",
          paid: license?.paid ?? false,
          trialActive: license?.trialActive ?? false,
          messagesUsed: settings?.messagesUsed ?? 0,
          messagesLimit: settings?.messagesLimit ?? 25,
          features: {
            welcome: settings?.welcome?.enabled ?? false,
            faq: settings?.faq?.enabled ?? false,
            timer: settings?.timer?.enabled ?? false,
          },
        });
        break;
      }

      case "POST /bot/enable": {
        await bridge.updateSettings({ masterEnabled: true });
        sendJson(res, 200, {
          success: true,
          message: "Bot enabled",
        });
        break;
      }

      case "POST /bot/disable": {
        await bridge.updateSettings({ masterEnabled: false });
        sendJson(res, 200, {
          success: true,
          message: "Bot disabled",
        });
        break;
      }

      case "GET /settings": {
        const settings = await bridge.getSettings();
        sendJson(res, 200, settings);
        break;
      }

      case "PUT /settings": {
        const body = await parseBody(req);

        // Validate that body is an object
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          sendError(res, 400, "Settings must be an object");
          return;
        }

        // Prevent updating certain fields
        delete body.tier;
        delete body.messagesUsed;
        delete body.messagesLimit;

        await bridge.updateSettings(body);
        const updated = await bridge.getSettings();
        sendJson(res, 200, {
          success: true,
          settings: updated,
        });
        break;
      }

      case "GET /settings/welcome": {
        const settings = await bridge.getSettings();
        sendJson(res, 200, settings.welcome);
        break;
      }

      case "PUT /settings/welcome": {
        const body = await parseBody(req);
        const settings = await bridge.getSettings();
        const updatedWelcome = { ...settings.welcome, ...body };
        await bridge.updateSettings({ welcome: updatedWelcome });
        sendJson(res, 200, {
          success: true,
          welcome: updatedWelcome,
        });
        break;
      }

      case "GET /settings/faq": {
        const settings = await bridge.getSettings();
        sendJson(res, 200, settings.faq);
        break;
      }

      case "PUT /settings/faq": {
        const body = await parseBody(req);
        const settings = await bridge.getSettings();
        const updatedFaq = { ...settings.faq, ...body };
        await bridge.updateSettings({ faq: updatedFaq });
        sendJson(res, 200, {
          success: true,
          faq: updatedFaq,
        });
        break;
      }

      case "GET /settings/timer": {
        const settings = await bridge.getSettings();
        sendJson(res, 200, settings.timer);
        break;
      }

      case "PUT /settings/timer": {
        const body = await parseBody(req);
        const settings = await bridge.getSettings();
        const updatedTimer = { ...settings.timer, ...body };
        await bridge.updateSettings({ timer: updatedTimer });
        sendJson(res, 200, {
          success: true,
          timer: updatedTimer,
        });
        break;
      }

      case "GET /analytics": {
        const analytics = await bridge.getAnalytics();
        sendJson(res, 200, analytics);
        break;
      }

      case "POST /analytics/reset": {
        await bridge.updateAnalytics({
          dailyStats: {},
          totalMessagesSent: 0,
          activeStreak: 0,
        });
        sendJson(res, 200, {
          success: true,
          message: "Analytics reset",
        });
        break;
      }

      default:
        sendError(res, 404, `Unknown endpoint: ${method} ${pathname}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(`[REST API] Error handling ${method} ${pathname}:`, error);
    sendError(res, 500, message);
  }
}

// Create and start server
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`BuzzChat REST API server running at http://${HOST}:${PORT}`);
  console.log("");
  console.log("Available endpoints:");
  console.log("  GET  /health           - Health check (no auth)");
  console.log("  GET  /status           - Bot status");
  console.log("  POST /bot/enable       - Enable bot");
  console.log("  POST /bot/disable      - Disable bot");
  console.log("  GET  /settings         - Get all settings");
  console.log("  PUT  /settings         - Update settings");
  console.log("  GET  /settings/welcome - Get welcome settings");
  console.log("  PUT  /settings/welcome - Update welcome settings");
  console.log("  GET  /settings/faq     - Get FAQ settings");
  console.log("  PUT  /settings/faq     - Update FAQ settings");
  console.log("  GET  /settings/timer   - Get timer settings");
  console.log("  PUT  /settings/timer   - Update timer settings");
  console.log("  GET  /analytics        - Get analytics data");
  console.log("  POST /analytics/reset  - Reset analytics");
  console.log("");
  console.log("All endpoints (except /health) require authentication:");
  console.log('  Authorization: Bearer bz_live_xxx');
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down REST API server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});
