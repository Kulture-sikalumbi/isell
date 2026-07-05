import { NextResponse } from "next/server";
import { getTools } from "@/lib/data";
import { getCheckoutTotal } from "@/lib/platform-fee";

export async function GET() {
  const tools = await getTools();
  return NextResponse.json({
    tools: tools.map((t) => ({
      name: t.name,
      slug: t.slug,
      price: getCheckoutTotal(t),
    })),
    fetchedAt: new Date().toISOString(),
  });
}
