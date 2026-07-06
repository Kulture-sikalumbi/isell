import Link from "next/link";
import { NewToolPageClient } from "./new-tool-client";
import { getAllCategories } from "@/lib/data";

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function NewToolPage({ searchParams }: PageProps) {
  const categories = await getAllCategories();
  const { category: categorySlug } = await searchParams;
  const defaultCategoryId =
    categories.find((c) => c.slug === categorySlug)?.id ?? categories[0]?.id;

  if (categories.length === 0) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center">
          <p className="text-zinc-300 font-medium mb-2">Create a tool first</p>
          <p className="text-sm text-zinc-500 mb-6">
            Add a tool name before creating devices under it.
          </p>
          <Link
            href="/admin/categories/new"
            className="inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white"
          >
            Add tool
          </Link>
        </div>
      </div>
    );
  }

  return (
    <NewToolPageClient categories={categories} defaultCategoryId={defaultCategoryId} />
  );
}
