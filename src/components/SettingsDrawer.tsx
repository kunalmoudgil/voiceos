"use client";

import type { DestinationId, NotionMode, QuickModeId, Settings } from "@/types";
import { QUICK_MODES } from "@/lib/templates/quickModes";
import { DESTINATION_LABELS } from "@/lib/routing/router";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  onClearHistory: () => void;
  historyCount: number;
}

const AUTO_ROUTE_OPTIONS: DestinationId[] = ["webhook", "notion", "sheets", "clipboard"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-accent/50"
    />
  );
}

export function SettingsDrawer({
  open,
  onClose,
  settings,
  onUpdate,
  onClearHistory,
  historyCount,
}: SettingsDrawerProps) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-3 py-1 text-sm text-white/60 hover:text-white"
          >
            Done
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Default Quick Mode</h3>
            <select
              value={settings.defaultQuickMode}
              onChange={(e) => onUpdate({ defaultQuickMode: e.target.value as QuickModeId })}
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-white outline-none"
            >
              {QUICK_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-white">Automation Webhook</h3>
            <p className="text-xs text-white/50">
              Make.com, n8n, Zapier, or any endpoint that accepts a JSON POST. Receives
              <code className="mx-1 rounded bg-canvas px-1 py-0.5 text-[11px]">
                {"{ timestamp, audio_duration, source_mode, raw_transcript, formatted_text }"}
              </code>
              .
            </p>
            <Field label="Webhook URL">
              <TextInput
                placeholder="https://hook.make.com/..."
                value={settings.webhookUrl}
                onChange={(e) => onUpdate({ webhookUrl: e.target.value })}
              />
            </Field>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-white">Notion</h3>
            <p className="text-xs text-white/50">
              Notion&apos;s API blocks direct browser requests (CORS). <strong>Webhook mode</strong>{" "}
              (recommended) relays through Make/n8n/Apps Script, which then writes to Notion
              server-side.
            </p>
            <Field label="Mode">
              <select
                value={settings.notionMode}
                onChange={(e) => onUpdate({ notionMode: e.target.value as NotionMode })}
                className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-white outline-none"
              >
                <option value="webhook">Via Webhook (recommended)</option>
                <option value="direct">Direct API (requires CORS proxy)</option>
              </select>
            </Field>

            {settings.notionMode === "webhook" ? (
              <Field label="Notion Relay Webhook URL">
                <TextInput
                  placeholder="https://hook.make.com/notion-relay"
                  value={settings.notionWebhookUrl}
                  onChange={(e) => onUpdate({ notionWebhookUrl: e.target.value })}
                />
              </Field>
            ) : (
              <>
                <Field label="Integration Secret" hint="Internal integration token from notion.so/my-integrations">
                  <TextInput
                    type="password"
                    placeholder="secret_..."
                    value={settings.notionApiKey}
                    onChange={(e) => onUpdate({ notionApiKey: e.target.value })}
                  />
                </Field>
                <Field label="Database ID">
                  <TextInput
                    placeholder="32-character database id"
                    value={settings.notionDatabaseId}
                    onChange={(e) => onUpdate({ notionDatabaseId: e.target.value })}
                  />
                </Field>
                <Field label="Title Property Name">
                  <TextInput
                    placeholder="Name"
                    value={settings.notionTitleProperty}
                    onChange={(e) => onUpdate({ notionTitleProperty: e.target.value })}
                  />
                </Field>
              </>
            )}
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-white">Google Sheets</h3>
            <p className="text-xs text-white/50">
              Deploy a Google Apps Script Web App (Execute as: Me \u00b7 Access: Anyone) with a{" "}
              <code className="rounded bg-canvas px-1 py-0.5 text-[11px]">doPost(e)</code> that appends
              <code className="mx-1 rounded bg-canvas px-1 py-0.5 text-[11px]">
                JSON.parse(e.postData.contents)
              </code>
              as a row.
            </p>
            <Field label="Apps Script Web App URL">
              <TextInput
                placeholder="https://script.google.com/macros/s/.../exec"
                value={settings.sheetsWebhookUrl}
                onChange={(e) => onUpdate({ sheetsWebhookUrl: e.target.value })}
              />
            </Field>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-white">Auto-route on completion</h3>
            <p className="text-xs text-white/50">
              Fire these destinations automatically the moment a transcript finishes \u2014 no tap
              required. (Claude/ChatGPT/Share always stay manual since they open a UI.)
            </p>
            <div className="flex flex-wrap gap-2">
              {AUTO_ROUTE_OPTIONS.map((id) => {
                const active = settings.autoRouteOnComplete.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() =>
                      onUpdate({
                        autoRouteOnComplete: active
                          ? settings.autoRouteOnComplete.filter((d) => d !== id)
                          : [...settings.autoRouteOnComplete, id],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-accent/50 bg-accent/15 text-white"
                        : "border-border bg-canvas text-white/60"
                    }`}
                  >
                    {DESTINATION_LABELS[id]}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-danger">Local Data</h3>
            <p className="text-xs text-white/50">
              {historyCount} transcript{historyCount === 1 ? "" : "s"} stored on this device only
              (IndexedDB). Nothing here is ever uploaded.
            </p>
            <button
              type="button"
              onClick={onClearHistory}
              className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/20"
            >
              Clear local history
            </button>
          </section>
        </div>
      </aside>
    </>
  );
}
