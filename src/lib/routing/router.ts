import type { DestinationId, RoutePayload, Settings, TranscriptRecord } from "@/types";
import type { RouteResult } from "./types";
import { postJsonWebhook } from "./webhook";
import { routeToNotion } from "./notion";
import { routeToSheets } from "./sheets";
import { copyToClipboard, openClaude, openChatGPT } from "./llmDeepLink";
import { shareText } from "./shareSheet";

export function buildPayload(record: TranscriptRecord): RoutePayload {
  return {
    timestamp: record.createdAt,
    audio_duration: record.audioDurationSec,
    source_mode: record.sourceMode,
    quick_mode: record.quickMode,
    raw_transcript: record.rawTranscript,
    formatted_text: record.formattedText,
    file_name: record.fileName,
  };
}

/** Dispatch a single destination. Used by both auto-route and manual taps. */
export async function routeToDestination(
  destination: DestinationId,
  record: TranscriptRecord,
  settings: Settings
): Promise<RouteResult> {
  const payload = buildPayload(record);

  switch (destination) {
    case "webhook":
      return postJsonWebhook(settings.webhookUrl, payload, "webhook");
    case "notion":
      return routeToNotion(payload, settings);
    case "sheets":
      return routeToSheets(payload, settings);
    case "clipboard": {
      const ok = await copyToClipboard(record.formattedText);
      return { destination, ok, message: ok ? "Copied to clipboard" : "Clipboard copy failed." };
    }
    case "claude": {
      const outcome = await openClaude(record.formattedText);
      return {
        destination,
        ok: outcome.opened,
        message: outcome.copiedToClipboard
          ? "Opened Claude \u2014 transcript was too long for a URL, so it's on your clipboard. Paste it in."
          : "Opened Claude with transcript pre-filled.",
      };
    }
    case "chatgpt": {
      const outcome = await openChatGPT(record.formattedText);
      return {
        destination,
        ok: outcome.opened,
        message: outcome.copiedToClipboard
          ? "Opened ChatGPT \u2014 transcript was too long for a URL, so it's on your clipboard. Paste it in."
          : "Opened ChatGPT with transcript pre-filled.",
      };
    }
    case "share": {
      const result = await shareText("VoiceOS transcript", record.formattedText);
      return { destination, ok: result.ok, message: result.message };
    }
    default:
      return { destination, ok: false, message: "Unknown destination." };
  }
}

export async function routeToMany(
  destinations: DestinationId[],
  record: TranscriptRecord,
  settings: Settings
): Promise<RouteResult[]> {
  return Promise.all(destinations.map((d) => routeToDestination(d, record, settings)));
}

export const DESTINATION_LABELS: Record<DestinationId, string> = {
  webhook: "Automation Webhook",
  notion: "Notion",
  sheets: "Google Sheets",
  claude: "Claude",
  chatgpt: "ChatGPT",
  share: "Share Sheet",
  clipboard: "Clipboard",
};
