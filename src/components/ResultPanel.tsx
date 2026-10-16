"use client";

import { useState } from "react";
import type { DestinationId, TranscriptRecord } from "@/types";
import { formatDuration, relativeTime } from "@/lib/utils";

interface ResultPanelProps {
  record: TranscriptRecord;
  onFormattedTextChange: (text: string) => void;
  onRoute: (destination: DestinationId) => Promise<void> | void;
  routingDestination: DestinationId | null;
}

const DESTINATION_BUTTONS: { id: DestinationId; label: string; icon: string }[] = [
  { id: "webhook", label: "Webhook", icon: "\u26a1" },
  { id: "notion", label: "Notion", icon: "\ud83d\udcc4" },
  { id: "sheets", label: "Sheets", icon: "\ud83d\udcca" },
  { id: "claude", label: "Claude", icon: "\u2726" },
  { id: "chatgpt", label: "ChatGPT", icon: "\ud83d\udcac" },
  { id: "share", label: "Share", icon: "\u2197" },
  { id: "clipboard", label: "Copy", icon: "\u29c9" },
];

export function ResultPanel({ record, onFormattedTextChange, onRoute, routingDestination }: ResultPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  const lastAttemptFor = (id: DestinationId) =>
    [...record.routedTo].reverse().find((a) => a.destination === id);

  return (
    <div className="animate-fadeIn rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Transcript ready</p>
          <p className="text-xs text-white/50">
            {relativeTime(record.createdAt)} \u00b7 {formatDuration(record.audioDurationSec)}
            {record.fileName ? ` \u00b7 ${record.fileName}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="rounded-full border border-border px-3 py-1 text-xs text-white/60 hover:text-white"
        >
          {showRaw ? "Formatted" : "Raw"}
        </button>
      </div>

      {showRaw ? (
        <div className="max-h-64 overflow-y-auto rounded-xl bg-canvas p-3 text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
          {record.rawTranscript || <span className="text-white/40">(empty)</span>}
        </div>
      ) : (
        <textarea
          value={record.formattedText}
          onChange={(e) => onFormattedTextChange(e.target.value)}
          rows={8}
          className="w-full resize-none rounded-xl bg-canvas p-3 text-sm leading-relaxed text-white/90 outline-none focus:ring-1 focus:ring-accent/50"
        />
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {DESTINATION_BUTTONS.map((d) => {
          const attempt = lastAttemptFor(d.id);
          const isLoading = routingDestination === d.id;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onRoute(d.id)}
              disabled={isLoading}
              title={attempt ? attempt.message : undefined}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-medium transition disabled:opacity-50 ${
                attempt?.status === "success"
                  ? "border-success/40 bg-success/10 text-success"
                  : attempt?.status === "error"
                    ? "border-danger/40 bg-danger/10 text-danger"
                    : "border-border bg-canvas text-white/70 hover:border-white/25 hover:text-white"
              }`}
            >
              <span className="text-base leading-none">{isLoading ? "\u22ef" : d.icon}</span>
              {d.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
