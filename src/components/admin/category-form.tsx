"use client";

import { useState } from "react";
import { ChevronRight, Plus, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ToolCategory } from "@/types/database";

function extractPublicLogoPath(url: string): string | null {
  // Supabase public URL shape:
  // .../storage/v1/object/public/<bucket>/<path>
  const marker = "/storage/v1/object/public/logos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length).split("?")[0]?.trim();
  return path && path.startsWith("categories/") ? path : null;
}

interface CategoryFormProps {
  category?: ToolCategory;
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
  onSaveAndNext?: (data: Record<string, unknown>) => void | Promise<void>;
}

export function CategoryForm({ category, onSubmit, onSaveAndNext }: CategoryFormProps) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon_url: category?.icon_url ?? "",
    sort_order: category?.sort_order?.toString() ?? "0",
    is_featured: category?.is_featured ?? false,
    featured_sort_order: category?.featured_sort_order?.toString() ?? "0",
    is_active: category?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(
    category?.icon_url ? extractPublicLogoPath(category.icon_url) : null
  );

  function update(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitPayload(
    submitFn: ((data: Record<string, unknown>) => void | Promise<void>) | undefined
  ) {
    setSubmitting(true);
    setError("");

    try {
      const sortOrder = parseInt(form.sort_order, 10);
      const featuredSort = parseInt(form.featured_sort_order, 10);
      await submitFn?.({
        name: form.name.trim(),
        description: form.description.trim(),
        icon_url: form.icon_url.trim(),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitPayload(onSubmit);
  }

  async function handleSaveAndNext(e: React.FormEvent) {
    e.preventDefault();
    await submitPayload(onSaveAndNext);
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("categoryName", form.name || "tool");
      if (logoPath) body.append("previousPath", logoPath);

      const res = await fetch("/api/admin/categories/logo", {
        method: "POST",
        body,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }
      update("icon_url", String(result.url || ""));
      setLogoPath(typeof result.path === "string" ? result.path : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setError("");
    const path = logoPath || (form.icon_url.trim() ? extractPublicLogoPath(form.icon_url.trim()) : null);
    if (path) {
      setUploading(true);
      try {
        await fetch("/api/admin/categories/logo", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path }),
        });
      } catch {
        // ignore delete errors; worst case it's an orphaned file
      } finally {
        setUploading(false);
      }
    }
    setLogoPath(null);
    update("icon_url", "");
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

        <Input
          label="Tool logo URL"
          value={form.icon_url}
          onChange={(e) => update("icon_url", e.target.value)}
          placeholder="https://example.com/logo.png"
          hint="Optional image shown on the category card in the tools browse page"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploading || submitting}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void uploadLogo(file);
                }
                e.currentTarget.value = "";
              }}
            />
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06] transition-colors">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload logo file"}
            </span>
          </label>
          {form.icon_url.trim() && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={removeLogo}
              disabled={uploading || submitting}
            >
              <X className="h-4 w-4" />
              Remove logo
            </Button>
          )}
        </div>
        {form.icon_url.trim() && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.icon_url.trim()}
              alt="Category logo preview"
              className="h-12 w-12 rounded-lg object-cover border border-white/10"
            />
            <p className="text-xs text-zinc-500">Preview of category card logo</p>
          </div>
        )}

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

      <div className="flex flex-wrap gap-3">
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
        {category && onSaveAndNext && (
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={submitting}
            onClick={handleSaveAndNext}
          >
            {submitting ? "Saving…" : (
              <>
                Save &amp; next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
