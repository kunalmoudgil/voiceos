"use client";

import { useCallback, useEffect, useState } from "react";
import type { Settings } from "@/types";
import { DEFAULT_SETTINGS, loadSettings, updateSettings, SETTINGS_CHANGED_EVENT } from "@/lib/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);

    const onChange = (event: Event) => {
      const custom = event as CustomEvent<Settings>;
      setSettings(custom.detail);
    };
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings(updateSettings(patch));
  }, []);

  return { settings, update, hydrated };
}
