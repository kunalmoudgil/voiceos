"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DestinationId, QuickModeId, TranscriptRecord } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { useHistory } from "@/hooks/useHistory";
import { useTranscriber } from "@/hooks/useTranscriber";
import { useToast } from "@/components/providers/ToastProvider";
import { Header } from "@/components/Header";
import { QuickModeSelector } from "@/components/QuickModeSelector";
import { RecordPanel } from "@/components/RecordPanel";
import { FileDropZone } from "@/components/FileDropZone";
import { ResultPanel } from "@/components/ResultPanel";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { HistoryFeed } from "@/components/HistoryFeed";
import { decodeToPCM } from "@/lib/audio/decode";
import { formatTranscript } from "@/lib/templates/quickModes";
import { routeToDestination, DESTINATION_LABELS } from "@/lib/routing/router";
import { uuid } from "@/lib/utils";
import type { RecorderResult } from "@/hooks/useRecorder";

export default function Home() {
  const { settings, update, hydrated } = useSettings();
  const history = useHistory();
  const transcriber = useTranscriber(true);
  const { push } = useToast();

  const [quickMode, setQuickMode] = useState<QuickModeId>("raw");
  const [activeRecord, setActiveRecord] = useState<TranscriptRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");
  const [routingDestination, setRoutingDestination] = useState<DestinationId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const didSyncDefault = useRef(false);
  useEffect(() => {
    if (hydrated && !didSyncDefault.current) {
      didSyncDefault.current = true;
      setQuickMode(settings.defaultQuickMode);
    }
  }, [hydrated, settings.defaultQuickMode]);

  const routeAndLog = useCallback(
    async (destination: DestinationId, record: TranscriptRecord): Promise<TranscriptRecord> => {
      const result = await routeToDestination(destination, record, settings);
      const attempt = {
        destination,
        status: (result.ok ? "success" : "error") as "success" | "error",
        timestamp: new Date().toISOString(),
        message: result.message,
      };
      const nextRoutedTo = [...record.routedTo, attempt];
      const updated = (await history.patch(record.id, { routedTo: nextRoutedTo })) ?? {
        ...record,
        routedTo: nextRoutedTo,
      };
      push(`${DESTINATION_LABELS[destination]}: ${result.message}`, result.ok ? "success" : "error");
      return updated;
    },
    [settings, history, push]
  );

  const finalizeTranscript = useCallback(
    async (args: {
      rawTranscript: string;
      durationSec: number;
      sourceMode: TranscriptRecord["sourceMode"];
      fileName?: string;
    }) => {
      const createdAt = new Date().toISOString();
      const formattedText = formatTranscript(quickMode, {
        rawTranscript: args.rawTranscript,
        createdAt,
        audioDurationSec: args.durationSec,
        sourceMode: args.sourceMode,
        fileName: args.fileName,
      });

      let record: TranscriptRecord = {
        id: uuid(),
        createdAt,
        sourceMode: args.sourceMode,
        quickMode,
        audioDurationSec: args.durationSec,
        fileName: args.fileName,
        rawTranscript: args.rawTranscript,
        formattedText,
        routedTo: [],
      };

      await history.add(record);
      setActiveRecord(record);
      push("Transcribed on-device \u2014 nothing left this phone.", "success");

      for (const destination of settings.autoRouteOnComplete) {
        record = await routeAndLog(destination, record);
        setActiveRecord(record);
      }
    },
    [quickMode, history, push, settings.autoRouteOnComplete, routeAndLog]
  );

  const runPipeline = useCallback(
    async (
      source: Blob,
      sourceMode: TranscriptRecord["sourceMode"],
      fallbackDurationSec: number,
      fileName?: string
    ) => {
      setIsProcessing(true);
      try {
        setProcessingLabel("Decoding audio\u2026");
        const { pcm, durationSec } = await decodeToPCM(source);

        setProcessingLabel(
          transcriber.status === "ready"
            ? "Transcribing locally\u2026"
            : "Finishing one-time model setup, then transcribing\u2026"
        );
        const text = await transcriber.transcribe(pcm);

        await finalizeTranscript({
          rawTranscript: text,
          durationSec: durationSec || fallbackDurationSec,
          sourceMode,
          fileName,
        });
      } catch (err) {
        push(err instanceof Error ? err.message : "Transcription failed.", "error");
      } finally {
        setIsProcessing(false);
        setProcessingLabel("");
      }
    },
    [transcriber, finalizeTranscript, push]
  );

  const handleRecordingComplete = useCallback(
    (result: RecorderResult) => {
      runPipeline(result.blob, "live", result.durationSec);
    },
    [runPipeline]
  );

  const handleFileSelected = useCallback(
    (file: File) => {
      runPipeline(file, "import", 0, file.name);
    },
    [runPipeline]
  );

  const handleFormattedTextChange = useCallback(
    (text: string) => {
      setActiveRecord((prev) => (prev ? { ...prev, formattedText: text } : prev));
    },
    []
  );

  const commitFormattedText = useCallback(() => {
    if (activeRecord) history.patch(activeRecord.id, { formattedText: activeRecord.formattedText });
  }, [activeRecord, history]);

  const handleRoute = useCallback(
    async (destination: DestinationId) => {
      if (!activeRecord) return;
      setRoutingDestination(destination);
      const updated = await routeAndLog(destination, activeRecord);
      setActiveRecord(updated);
      setRoutingDestination(null);
    },
    [activeRecord, routeAndLog]
  );

  return (
    <div className="flex min-h-full flex-col">
      <Header
        engineStatus={transcriber.status}
        engineProgress={transcriber.overallProgress}
        engineError={transcriber.loadError}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 py-5">
        <QuickModeSelector value={quickMode} onChange={setQuickMode} />

        <RecordPanel onRecordingComplete={handleRecordingComplete} disabled={isProcessing} />

        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-white/30">
          <div className="h-px flex-1 bg-border" />
          or import
          <div className="h-px flex-1 bg-border" />
        </div>

        <FileDropZone onFileSelected={handleFileSelected} disabled={isProcessing} />

        {isProcessing && (
          <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            {processingLabel}
          </div>
        )}

        {activeRecord && !isProcessing && (
          <ResultPanel
            record={activeRecord}
            onFormattedTextChange={handleFormattedTextChange}
            onRoute={handleRoute}
            routingDestination={routingDestination}
          />
        )}
        {activeRecord && !isProcessing && (
          // Commit edits to IndexedDB once typing settles / panel re-renders.
          <CommitOnIdle onCommit={commitFormattedText} value={activeRecord.formattedText} />
        )}

        <HistoryFeed history={history} />
      </main>

      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdate={update}
        onClearHistory={history.clear}
        historyCount={history.transcripts.length}
      />
    </div>
  );
}

/** Debounced persistence for the editable transcript textarea. */
function CommitOnIdle({ value, onCommit }: { value: string; onCommit: () => void }) {
  useEffect(() => {
    const t = setTimeout(onCommit, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return null;
}
