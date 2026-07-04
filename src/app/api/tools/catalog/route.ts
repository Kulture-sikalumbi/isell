import { NextResponse } from "next/server";
import { getTools } from "@/lib/data";

export async function GET() {
  const tools = await getTools();
  return NextResponse.json({
    tools: tools.map((t) => ({
      name: t.name,
      slug: t.slug,
      retail_price: t.retail_price,
    })),
    fetchedAt: new Date().toISOString(),
  });
}
