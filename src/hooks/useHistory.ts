"use client";

import { useCallback, useEffect, useState } from "react";
import type { TranscriptRecord } from "@/types";
import {
  addTranscript,
  clearHistory,
  deleteTranscript,
  getAllTranscripts,
  searchTranscripts,
  updateTranscript,
} from "@/lib/db/historyDb";

export function useHistory() {
  const [transcripts, setTranscripts] = useState<TranscriptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async (q = query) => {
    setLoading(true);
    try {
      const results = q ? await searchTranscripts(q) : await getAllTranscripts();
      setTranscripts(results);
    } catch {
      setTranscripts([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refresh(query), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const add = useCallback(
    async (record: TranscriptRecord) => {
      await addTranscript(record);
      await refresh();
    },
    [refresh]
  );

  const patch = useCallback(
    async (id: string, patchData: Partial<TranscriptRecord>) => {
      const next = await updateTranscript(id, patchData);
      await refresh();
      return next;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTranscript(id);
      await refresh();
    },
    [refresh]
  );

  const clear = useCallback(async () => {
    await clearHistory();
    await refresh();
  }, [refresh]);

  return { transcripts, loading, query, setQuery, add, patch, remove, clear, refresh };
}
