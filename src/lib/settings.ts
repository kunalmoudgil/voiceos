"use client";

import type { Settings } from "@/types";

const SETTINGS_KEY = "voiceos:settings:v1";

export const DEFAULT_SETTINGS: Settings = {
  webhookUrl: "",
  notionMode: "webhook",
  notionWebhookUrl: "",
  notionApiKey: "",
  notionDatabaseId: "",
  notionTitleProperty: "Name",
  sheetsWebhookUrl: "",
  defaultQuickMode: "raw",
  autoRouteOnComplete: [],
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("voiceos:settings-changed", { detail: settings }));
  } catch {
    // localStorage can throw in private-browsing / storage-full edge cases.
    // Settings are a nice-to-have persistence layer, not critical path.
  }
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  saveSettings(next);
  return next;
}

export const SETTINGS_CHANGED_EVENT = "voiceos:settings-changed";
