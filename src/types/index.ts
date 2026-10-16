// Shared types for VoiceOS.
// Kept in one file so every layer (storage, routing, UI) agrees on shape.

export type SourceMode = "live" | "import";

export type QuickModeId = "ance" | "k2" | "call" | "raw";

export type DestinationId =
  | "webhook"
  | "notion"
  | "sheets"
  | "claude"
  | "chatgpt"
  | "share"
  | "clipboard";

export interface RouteAttempt {
  destination: DestinationId;
  status: "success" | "error" | "skipped";
  timestamp: string; // ISO
  message?: string;
}

export interface TranscriptRecord {
  id: string;
  createdAt: string; // ISO timestamp
  sourceMode: SourceMode;
  quickMode: QuickModeId;
  audioDurationSec: number;
  fileName?: string;
  rawTranscript: string;
  formattedText: string;
  routedTo: RouteAttempt[];
}

export type NotionMode = "webhook" | "direct";

export interface Settings {
  // Generic automation webhook (Make.com / n8n / Zapier / Google Apps Script)
  webhookUrl: string;

  // Notion
  notionMode: NotionMode;
  notionWebhookUrl: string; // recommended path (avoids browser CORS entirely)
  notionApiKey: string; // only used in "direct" mode
  notionDatabaseId: string; // only used in "direct" mode
  notionTitleProperty: string; // name of the Title property in the DB

  // Google Sheets via Apps Script Web App
  sheetsWebhookUrl: string;

  // Behavior
  defaultQuickMode: QuickModeId;
  autoRouteOnComplete: DestinationId[];
}

export interface TranscribeProgressEvent {
  status: string;
  file?: string;
  progress?: number; // 0-100
  loaded?: number;
  total?: number;
}

export type EngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "transcribing"
  | "error";

export interface RoutePayload {
  timestamp: string;
  audio_duration: number;
  source_mode: SourceMode;
  quick_mode: QuickModeId;
  raw_transcript: string;
  formatted_text: string;
  file_name?: string;
}
