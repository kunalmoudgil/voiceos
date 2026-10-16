"use client";

import { useState } from "react";
import type { TranscriptRecord } from "@/types";
import { useHistory } from "@/hooks/useHistory";
import { useToast } from "./providers/ToastProvider";
import { formatDuration, relativeTime, truncate, downloadTextFile } from "@/lib/utils";
import { copyToClipboard } from "@/lib/routing/llmDeepLink";
import { shareText, canShare } from "@/lib/routing/shareSheet";
import { getQuickMode } from "@/lib/templates/quickModes";

export function HistoryFeed({ history }: { history: ReturnType<typeof useHistory> }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">
          History <span className="text-white/40">({history.transcripts.length}/50)</span>
        </h2>
      </div>
      <input
        value={history.query}
        onChange={(e) => history.setQuery(e.target.value)}
        placeholder="Search past transcripts\u2026"
        className="mb-4 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-accent/50"
      />

      {history.loading && <p className="text-sm text-white/40">Loading\u2026</p>}

      {!history.loading && history.transcripts.length === 0 && (
        <p className="text-sm text-white/40">
          {history.query ? "No matches." : "Your transcripts will show up here \u2014 nothing's been recorded yet."}
        </p>
      )}

      <ul className="space-y-2">
        {history.transcripts.map((record) => (
          <HistoryItem key={record.id} record={record} onDelete={() => history.remove(record.id)} />
        ))}
      </ul>
    </section>
  );
}

function HistoryItem({ record, onDelete }: { record: TranscriptRecord; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const { push } = useToast();
  const mode = getQuickMode(record.quickMode);

  return (
    <li className="rounded-xl border border-border bg-canvas p-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/60">
              {mode.shortLabel}
            </span>
            <span className="text-[11px] text-white/40">
              {record.sourceMode === "live" ? "\ud83c\udf99\ufe0f live" : "\ud83d\udcc2 import"}
            </span>
            <span className="text-[11px] text-white/40">\u00b7 {formatDuration(record.audioDurationSec)}</span>
          </div>
          {!expanded && (
            <p className="truncate text-sm text-white/70">{truncate(record.rawTranscript, 90)}</p>
          )}
          <p className="mt-1 text-[11px] text-white/35">{relativeTime(record.createdAt)}</p>
        </div>
        <span className="pt-1 text-xs text-white/40">{expanded ? "\u25b2" : "\u25bc"}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface2 p-3 text-xs leading-relaxed text-white/80">
            {record.formattedText}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const ok = await copyToClipboard(record.formattedText);
                push(ok ? "Copied to clipboard" : "Copy failed", ok ? "success" : "error");
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-white/70 hover:text-white"
            >
              Copy
            </button>
            {canShare() && (
              <button
                type="button"
                onClick={async () => {
                  const result = await shareText("VoiceOS transcript", record.formattedText);
                  push(result.message, result.ok ? "success" : "error");
                }}
                className="rounded-full border border-border px-3 py-1 text-xs text-white/70 hover:text-white"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  `voiceos-${record.createdAt.slice(0, 19).replace(/[:T]/g, "-")}.txt`,
                  record.formattedText
                )
              }
              className="rounded-full border border-border px-3 py-1 text-xs text-white/70 hover:text-white"
            >
              Export .txt
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-danger/40 px-3 py-1 text-xs text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
          {record.routedTo.length > 0 && (
            <p className="text-[11px] text-white/40">
              Routed to: {record.routedTo.map((r) => `${r.destination} (${r.status})`).join(", ")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
