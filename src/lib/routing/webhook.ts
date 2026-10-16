import type { DestinationId, RoutePayload } from "@/types";
import type { RouteResult } from "./types";

/**
 * Generic JSON webhook sender used for the "Automation Engine" destination
 * (Make.com / n8n / Zapier catch-hooks) and for the Notion "via webhook"
 * mode. These services natively handle CORS for browser-originated POSTs,
 * so a plain application/json request works out of the box.
 */
export async function postJsonWebhook(
  url: string,
  payload: RoutePayload,
  destination: DestinationId
): Promise<RouteResult> {
  if (!url) {
    return { destination, ok: false, message: "No webhook URL configured in Settings." };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return {
        destination,
        ok: false,
        message: `Webhook responded ${res.status} ${res.statusText}`,
      };
    }
    return { destination, ok: true, message: "Delivered" };
  } catch (err) {
    return {
      destination,
      ok: false,
      message: err instanceof Error ? err.message : "Network request failed.",
    };
  }
}

/**
 * Google Apps Script Web Apps don't implement CORS preflight (no doOptions
 * handler by default), so any request with a non-"simple" Content-Type
 * (like application/json) fails. Sending as text/plain keeps the request
 * "simple" and preflight-free; the Apps Script side reads
 * `JSON.parse(e.postData.contents)`.
 */
export async function postTextPlainWebhook(
  url: string,
  payload: RoutePayload,
  destination: DestinationId
): Promise<RouteResult> {
  if (!url) {
    return { destination, ok: false, message: "No webhook URL configured in Settings." };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return {
        destination,
        ok: false,
        message: `Webhook responded ${res.status} ${res.statusText}`,
      };
    }
    return { destination, ok: true, message: "Delivered" };
  } catch (err) {
    return {
      destination,
      ok: false,
      message: err instanceof Error ? err.message : "Network request failed.",
    };
  }
}
