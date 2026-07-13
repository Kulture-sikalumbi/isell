import { notFound } from "next/navigation";
import { getAllCategories, getCategoryById } from "@/lib/data";
import { EditCategoryPage } from "./edit-category-client";
import type { ToolCategory } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getOrderedCategories(categories: ToolCategory[]): ToolCategory[] {
  return [...categories].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
  );
}

export default async function EditCategoryRoute({ params }: PageProps) {
  const { id } = await params;
  const [category, categories] = await Promise.all([getCategoryById(id), getAllCategories()]);

  if (!category) notFound();

  const orderedCategories = getOrderedCategories(categories);
  const currentIndex = orderedCategories.findIndex((item) => item.id === category.id);
  const prev = currentIndex > 0 ? orderedCategories[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < orderedCategories.length - 1
      ? orderedCategories[currentIndex + 1]
      : null;

  return (
    <EditCategoryPage
      category={category}
      prevCategory={prev ? { id: prev.id, name: prev.name } : null}
      nextCategory={next ? { id: next.id, name: next.name } : null}
    />
  );
}
