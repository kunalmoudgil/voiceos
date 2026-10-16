"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { TranscriptRecord } from "@/types";

const DB_NAME = "voiceos-db";
const DB_VERSION = 1;
const STORE = "transcripts";
export const HISTORY_LIMIT = 50;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available in this environment."));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      },
    });
  }
  return dbPromise;
}

export async function addTranscript(record: TranscriptRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE, record);
  await trimHistory(db);
}

async function trimHistory(db: IDBPDatabase): Promise<void> {
  const all = await db.getAllFromIndex(STORE, "createdAt");
  if (all.length <= HISTORY_LIMIT) return;
  const sorted = [...all].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  const toDelete = sorted.slice(HISTORY_LIMIT);
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all(toDelete.map((r) => tx.store.delete(r.id)));
  await tx.done;
}

export async function getAllTranscripts(): Promise<TranscriptRecord[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

export async function getTranscript(id: string): Promise<TranscriptRecord | undefined> {
  const db = await getDb();
  return db.get(STORE, id);
}

export async function updateTranscript(
  id: string,
  patch: Partial<TranscriptRecord>
): Promise<TranscriptRecord | undefined> {
  const db = await getDb();
  const existing = await db.get(STORE, id);
  if (!existing) return undefined;
  const next = { ...existing, ...patch };
  await db.put(STORE, next);
  return next;
}

export async function deleteTranscript(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function clearHistory(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
}

export async function searchTranscripts(query: string): Promise<TranscriptRecord[]> {
  const all = await getAllTranscripts();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (r) =>
      r.rawTranscript.toLowerCase().includes(q) ||
      r.formattedText.toLowerCase().includes(q) ||
      (r.fileName ?? "").toLowerCase().includes(q)
  );
}
