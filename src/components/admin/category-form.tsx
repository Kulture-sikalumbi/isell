"use client";

import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ToolCategory } from "@/types/database";

interface CategoryFormProps {
  category?: ToolCategory;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
}

export function CategoryForm({ category, onSubmit }: CategoryFormProps) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    download_url: category?.download_url ?? "",
    download_url_mac: category?.download_url_mac ?? "",
    sort_order: category?.sort_order?.toString() ?? "0",
    is_featured: category?.is_featured ?? false,
    featured_sort_order: category?.featured_sort_order?.toString() ?? "0",
    is_active: category?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const sortOrder = parseInt(form.sort_order, 10);
      const featuredSort = parseInt(form.featured_sort_order, 10);
      await onSubmit?.({
        name: form.name.trim(),
        description: form.description.trim(),
        download_url: form.download_url.trim(),
        download_url_mac: form.download_url_mac.trim(),
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        is_featured: form.is_featured,
        featured_sort_order: Number.isFinite(featuredSort) ? featuredSort : 0,
        is_active: form.is_active,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Tool name"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="SMD Bypass iCloud [iPhone - iPad]"
          required
          hint="The main tool name — shown in the storefront sidebar"
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Optional overview shown when this tool is selected"
        />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-zinc-300">Desktop downloads</p>
          <p className="text-xs text-zinc-500 -mt-2">
            Free download links for Windows and Mac — customers see these when browsing this tool.
          </p>
          <Input
            label="Windows download link"
            value={form.download_url}
            onChange={(e) => update("download_url", e.target.value)}
            placeholder="https://..."
            hint="Win tool installer or zip"
          />
          <Input
            label="Mac download link"
            value={form.download_url_mac}
            onChange={(e) => update("download_url_mac", e.target.value)}
            placeholder="https://..."
            hint="Mac tool installer or dmg"
          />
        </div>

        <Input
          label="Sort order"
          type="number"
          value={form.sort_order}
          onChange={(e) => update("sort_order", e.target.value)}
          hint="Lower numbers appear first in the tools list"
        />
      </div>

      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => update("is_featured", e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500"
          />
          <span className="text-sm text-zinc-300">Feature on homepage</span>
        </label>
        {form.is_featured && (
          <Input
            label="Homepage featured order"
            type="number"
            value={form.featured_sort_order}
            onChange={(e) => update("featured_sort_order", e.target.value)}
            hint="Lower numbers appear first on the homepage (max 4 shown)"
          />
        )}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => update("is_active", e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500"
        />
        <span className="text-sm text-zinc-300">Visible on storefront</span>
      </label>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Saving…" : category ? (
          <>
            <Save className="h-4 w-4" />
            Save tool
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Add tool
          </>
        )}
      </Button>
    </form>
  );
}
