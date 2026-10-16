"use client";

import type { EngineStatus } from "@/types";
import { ModelStatusPill } from "./ModelStatusPill";

interface HeaderProps {
  engineStatus: EngineStatus;
  engineProgress: number;
  engineError: string | null;
  onOpenSettings: () => void;
}

export function Header({ engineStatus, engineProgress, engineError, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2 text-sm font-bold text-white">
            V
          </span>
          <div>
            <h1 className="text-sm font-bold leading-tight text-white">VoiceOS</h1>
            <p className="text-[11px] leading-tight text-white/40">Local-only transcription</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ModelStatusPill status={engineStatus} progress={engineProgress} error={engineError} />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-white/70 hover:text-white"
          >
            <GearIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.5a7.97 7.97 0 0 0 0-3l1.8-1.4-1.6-2.8-2.1.6a8 8 0 0 0-2.6-1.5L14.5 3h-3l-.4 2.4a8 8 0 0 0-2.6 1.5l-2.1-.6-1.6 2.8L6.6 10.5a7.97 7.97 0 0 0 0 3L4.8 15l1.6 2.8 2.1-.6a8 8 0 0 0 2.6 1.5l.4 2.3h3l.4-2.3a8 8 0 0 0 2.6-1.5l2.1.6 1.6-2.8-1.8-1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
