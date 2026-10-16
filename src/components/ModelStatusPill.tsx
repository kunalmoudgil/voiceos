"use client";

import type { EngineStatus } from "@/types";

interface ModelStatusPillProps {
  status: EngineStatus;
  progress: number;
  error: string | null;
}

const STATUS_META: Record<EngineStatus, { label: string; dot: string }> = {
  idle: { label: "Idle", dot: "bg-white/30" },
  loading: { label: "Loading model\u2026", dot: "bg-warn animate-pulse" },
  ready: { label: "Ready \u00b7 100% on-device", dot: "bg-success" },
  transcribing: { label: "Transcribing\u2026", dot: "bg-accent animate-pulse" },
  error: { label: "Model error", dot: "bg-danger" },
};

export function ModelStatusPill({ status, progress, error }: ModelStatusPillProps) {
  const meta = STATUS_META[status];
  const label = status === "loading" && progress > 0 ? `${meta.label} ${progress}%` : meta.label;

  return (
    <div
      title={error ?? undefined}
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-white/70"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {label}
    </div>
  );
}
