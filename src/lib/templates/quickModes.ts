import type { QuickModeId, SourceMode } from "@/types";

export interface QuickModeTemplateInput {
  rawTranscript: string;
  createdAt: string;
  audioDurationSec: number;
  sourceMode: SourceMode;
  fileName?: string;
}

export interface QuickMode {
  id: QuickModeId;
  label: string;
  shortLabel: string;
  description: string;
  accent: string; // tailwind color class suffix
  format: (input: QuickModeTemplateInput) => string;
}

function fmtDuration(sec: number): string {
  if (!sec || Number.isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function sourceLabel(input: QuickModeTemplateInput): string {
  if (input.sourceMode === "import") {
    return input.fileName ? `Imported file \u2014 ${input.fileName}` : "Imported audio/video file";
  }
  return "Live dictation";
}

export const QUICK_MODES: QuickMode[] = [
  {
    id: "ance",
    label: "Run Club / Ance CRM",
    shortLabel: "Ance CRM",
    description: "Structured lead capture for runner feedback / shoe fit conversations.",
    accent: "accent",
    format: (input) => `## Ance CRM \u2014 Runner Note
**Captured:** ${fmtTimestamp(input.createdAt)} (${fmtDuration(input.audioDurationSec)}, ${sourceLabel(input)})

- **Name:**
- **Shoe Brand:**
- **Pain Point:**
- **Seeded Status:**
- **Follow-up Needed:**

### Raw Notes
${input.rawTranscript}
`,
  },
  {
    id: "k2",
    label: "K2 Strategic Note",
    shortLabel: "K2 Strategic",
    description: "Lightweight strategic-thinking capture: context, insight, decision, actions.",
    accent: "accent2",
    format: (input) => `## K2 Strategic Note
**Captured:** ${fmtTimestamp(input.createdAt)} (${fmtDuration(input.audioDurationSec)}, ${sourceLabel(input)})

- **Context:**
- **Key Insight:**
- **Decision:**
- **Action Items:**

### Raw Notes
${input.rawTranscript}
`,
  },
  {
    id: "call",
    label: "Call / Zoom Summary",
    shortLabel: "Call Summary",
    description: "Summary scaffold for imported phone calls, Zoom/Teams meetings, voice memos.",
    accent: "success",
    format: (input) => `## Call / Meeting Summary
**Captured:** ${fmtTimestamp(input.createdAt)} (${fmtDuration(input.audioDurationSec)}, ${sourceLabel(input)})

- **Participants:**
- **Summary:**
- **Key Points:**
- **Action Items:**
- **Follow-ups:**

### Full Transcript
${input.rawTranscript}
`,
  },
  {
    id: "raw",
    label: "General Raw",
    shortLabel: "General",
    description: "No structure applied \u2014 just the transcript, timestamped.",
    accent: "warn",
    format: (input) => `## Voice Note
**Captured:** ${fmtTimestamp(input.createdAt)} (${fmtDuration(input.audioDurationSec)}, ${sourceLabel(input)})

${input.rawTranscript}
`,
  },
];

export function getQuickMode(id: QuickModeId): QuickMode {
  return QUICK_MODES.find((m) => m.id === id) ?? QUICK_MODES[QUICK_MODES.length - 1];
}

export function formatTranscript(id: QuickModeId, input: QuickModeTemplateInput): string {
  return getQuickMode(id).format(input);
}
