import { notFound } from "next/navigation";
import { getCategoryById } from "@/lib/data";
import { EditCategoryPage } from "./edit-category-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryRoute({ params }: PageProps) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category) notFound();
  return <EditCategoryPage category={category} />;
}
