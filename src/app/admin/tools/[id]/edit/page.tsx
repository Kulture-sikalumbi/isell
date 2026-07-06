import { notFound } from "next/navigation";
import { getAllCategories, getToolById } from "@/lib/data";
import { EditToolPage } from "./edit-tool-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditToolRoute({ params }: PageProps) {
  const { id } = await params;
  const [tool, categories] = await Promise.all([getToolById(id), getAllCategories()]);
  if (!tool) notFound();
  return <EditToolPage tool={tool} categories={categories} />;
}
