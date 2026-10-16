"use client";

import { QUICK_MODES } from "@/lib/templates/quickModes";
import type { QuickModeId } from "@/types";

interface QuickModeSelectorProps {
  value: QuickModeId;
  onChange: (id: QuickModeId) => void;
}

const DOT_CLASS: Record<string, string> = {
  accent: "bg-accent",
  accent2: "bg-accent2",
  success: "bg-success",
  warn: "bg-warn",
};

export function QuickModeSelector({ value, onChange }: QuickModeSelectorProps) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap">
      {QUICK_MODES.map((mode) => {
        const selected = mode.id === value;
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            title={mode.description}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-medium transition ${
              selected
                ? "border-accent/60 bg-accent/15 text-white shadow-glow"
                : "border-border bg-surface text-white/70 hover:border-white/20 hover:text-white"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[mode.accent]}`} />
            {mode.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
