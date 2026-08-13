"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminSettings } from "@/lib/admin-settings";

export function ChatSettingsPanel() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [tempDays, setTempDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings);
        setTempDays(d.settings.auto_clear_chat_days);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "auto_clear_chat_days",
          value: tempDays ? String(tempDays) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setTempDays(data.settings.auto_clear_chat_days);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 border border-white/10">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className="glass rounded-2xl p-6 border border-white/10 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-cyan-400" />
          Chat Storage Management
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Automatically delete old support conversations to save storage
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 flex gap-3">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-100">
          Messages older than the configured period will be permanently deleted. This cannot be undone.
        </p>
      </div>

      {/* Auto-clear setting */}
      <div className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={tempDays !== null}
            onChange={(e) => setTempDays(e.target.checked ? 30 : null)}
            className="h-4 w-4 rounded accent-cyan-500"
          />
          <span className="text-sm text-white font-medium">
            Auto-clear old conversations
          </span>
        </label>

        {tempDays !== null && (
          <div className="ml-7 space-y-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs text-zinc-400">Delete messages older than:</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={tempDays}
                  onChange={(e) => setTempDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                />
                <span className="text-xs text-zinc-500">days</span>
              </div>
            </label>
            <p className="text-xs text-zinc-500">
              {tempDays === 1
                ? "Chats older than 1 day will be deleted daily"
                : `Chats older than ${tempDays} days will be deleted daily`}
            </p>
          </div>
        )}

        {tempDays === null && (
          <p className="text-xs text-zinc-500 ml-7">Auto-clear is currently disabled</p>
        )}
      </div>

      {/* Save button */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSave}
          disabled={saving || tempDays === settings.auto_clear_chat_days}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
        <p className="text-xs font-semibold text-white">How it works:</p>
        <ul className="text-xs text-zinc-400 space-y-1 ml-3">
          <li>• Runs daily at 2 AM UTC</li>
          <li>• Only deletes messages that are fully sent (not pending)</li>
          <li>• Images in storage will also be removed (if enabled)</li>
          <li>• Deletion is permanent and cannot be undone</li>
        </ul>
      </div>
    </div>
  );
}
