import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ tools: [] });

  let query = supabase
    .from("tools")
    .select("id, name, slug, icon_url, description, retail_price, price_currency")
    .eq("is_active", true)
    .order("name")
    .limit(20);

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data } = await query;
  return NextResponse.json({ tools: data ?? [] });
}
