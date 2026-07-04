import { notFound } from "next/navigation";
import { getToolById } from "@/lib/data";
import { EditToolPage } from "./edit-tool-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditToolRoute({ params }: PageProps) {
  const { id } = await params;
  const tool = await getToolById(id);
  if (!tool) notFound();
  return <EditToolPage tool={tool} />;
}
