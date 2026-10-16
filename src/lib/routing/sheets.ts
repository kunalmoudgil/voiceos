import type { RoutePayload, Settings } from "@/types";
import type { RouteResult } from "./types";
import { postTextPlainWebhook } from "./webhook";

/**
 * Google Sheets destination, via a Google Apps Script Web App deployed as
 * "Execute as: Me" / "Who has access: Anyone". Example doPost():
 *
 *   function doPost(e) {
 *     const data = JSON.parse(e.postData.contents);
 *     const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("VoiceOS");
 *     sheet.appendRow([
 *       data.timestamp, data.source_mode, data.quick_mode,
 *       data.audio_duration, data.raw_transcript, data.formatted_text,
 *     ]);
 *     return ContentService.createTextOutput("ok");
 *   }
 */
export async function routeToSheets(payload: RoutePayload, settings: Settings): Promise<RouteResult> {
  if (!settings.sheetsWebhookUrl) {
    return {
      destination: "sheets",
      ok: false,
      message: "No Google Sheets Apps Script URL configured in Settings.",
    };
  }
  return postTextPlainWebhook(settings.sheetsWebhookUrl, payload, "sheets");
}
