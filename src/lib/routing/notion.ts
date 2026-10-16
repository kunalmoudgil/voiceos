import type { RoutePayload, Settings } from "@/types";
import type { RouteResult } from "./types";
import { postJsonWebhook } from "./webhook";

/**
 * Notion's API does not send Access-Control-Allow-Origin headers, so a
 * direct `fetch()` from a browser to api.notion.com will reliably fail with
 * a CORS error — this is a Notion platform limitation, not a bug here.
 * "Direct" mode is included because some users proxy it through their own
 * CORS-enabled edge function; the recommended default is "webhook" mode,
 * which forwards the same structured payload to a Make/n8n/Apps Script
 * scenario that talks to Notion server-side (no CORS involved).
 */
export async function routeToNotion(payload: RoutePayload, settings: Settings): Promise<RouteResult> {
  if (settings.notionMode === "webhook") {
    const result = await postJsonWebhook(settings.notionWebhookUrl, payload, "notion");
    if (!result.ok && !settings.notionWebhookUrl) {
      return {
        ...result,
        message: "No Notion webhook URL configured in Settings.",
      };
    }
    return result;
  }

  // Direct mode
  if (!settings.notionApiKey || !settings.notionDatabaseId) {
    return {
      destination: "notion",
      ok: false,
      message: "Missing Notion API key or database ID in Settings.",
    };
  }

  try {
    const res = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.notionApiKey}`,
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: settings.notionDatabaseId },
        properties: {
          [settings.notionTitleProperty || "Name"]: {
            title: [{ text: { content: `Voice note \u2014 ${new Date(payload.timestamp).toLocaleString()}` } }],
          },
        },
        children: [
          {
            object: "block",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: payload.formatted_text.slice(0, 2000) } }],
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        destination: "notion",
        ok: false,
        message: `Notion API responded ${res.status}. ${body.slice(0, 160)}`,
      };
    }
    return { destination: "notion", ok: true, message: "Page created" };
  } catch (err) {
    return {
      destination: "notion",
      ok: false,
      message:
        err instanceof Error
          ? `${err.message} (Notion blocks direct browser calls via CORS \u2014 switch Notion mode to "webhook" in Settings and use a Make/n8n/Apps Script relay.)`
          : "Request failed.",
    };
  }
}
