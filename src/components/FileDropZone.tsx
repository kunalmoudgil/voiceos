"use client";

import { useRef, useState, type DragEvent } from "react";
import { formatBytes } from "@/lib/utils";

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropZone({ onFileSelected, disabled }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setLastFile(file);
    onFileSelected(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
        disabled
          ? "cursor-not-allowed border-border/60 opacity-40"
          : isDragging
            ? "border-accent bg-accent/10"
            : "border-border bg-surface hover:border-white/25"
      }`}
    >
      <FileIcon />
      <p className="text-sm font-medium text-white">
        Drop a call recording, Zoom audio, or voice memo
      </p>
      <p className="text-xs text-white/50">
        iPhone call recordings \u00b7 Zoom/Teams audio \u00b7 Voice Memos \u00b7 screen recording .mp4
      </p>
      {lastFile && (
        <p className="mt-1 max-w-full truncate text-xs text-accent">
          {lastFile.name} \u00b7 {formatBytes(lastFile.size)}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

function FileIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white/60"
      />
    </svg>
  );
}
