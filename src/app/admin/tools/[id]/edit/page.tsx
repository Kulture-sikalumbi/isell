import { notFound } from "next/navigation";
import { getAllCategories, getAllTools, getToolById } from "@/lib/data";
import { EditToolPage } from "./edit-tool-client";
import type { ToolCategory, ToolWithCategory } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

function getOrderedCatalogDevices(
  categories: ToolCategory[],
  allDevices: ToolWithCategory[]
): ToolWithCategory[] {
  const byCategory = new Map<string, ToolWithCategory[]>();

  for (const device of allDevices) {
    if (!device.category_id) continue;
    const list = byCategory.get(device.category_id) ?? [];
    list.push(device);
    byCategory.set(device.category_id, list);
  }

  for (const [categoryId, devices] of byCategory) {
    devices.sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)
    );
    byCategory.set(categoryId, devices);
  }

  return categories.flatMap((category) => byCategory.get(category.id) ?? []);
}

export default async function EditToolRoute({ params }: PageProps) {
  const { id } = await params;
  const [tool, categories, allDevices] = await Promise.all([
    getToolById(id),
    getAllCategories(),
    getAllTools(),
  ]);

  if (!tool) notFound();

  const orderedDevices = getOrderedCatalogDevices(categories, allDevices);
  const currentIndex = orderedDevices.findIndex((device) => device.id === tool.id);
  const prev = currentIndex > 0 ? orderedDevices[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < orderedDevices.length - 1
      ? orderedDevices[currentIndex + 1]
      : null;

  return (
    <EditToolPage
      tool={tool}
      categories={categories}
      prevDevice={prev ? { id: prev.id, name: prev.name } : null}
      nextDevice={next ? { id: next.id, name: next.name } : null}
    />
  );
}
