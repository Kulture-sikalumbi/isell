import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

function mapCategoryWriteError(message: string): string {
  if (
    message.includes("icon_url") &&
    (message.includes("column") || message.includes("schema cache"))
  ) {
    return "Database schema is outdated: missing tool_categories.icon_url. Run latest Supabase migrations and try again.";
  }
  return message;
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name as string)?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const slug = slugify(name);
    const sortOrder = Number(body.sort_order);
    const featuredSort = Number(body.featured_sort_order);
    const categoryData = {
      slug,
      name,
      description: (body.description as string)?.trim() || null,
      icon_url: (body.icon_url as string)?.trim() || null,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      is_featured: Boolean(body.is_featured),
      featured_sort_order: Number.isFinite(featuredSort) ? featuredSort : 0,
      is_active: body.is_active ?? true,
    };

    const { data, error } = await supabase
      .from("tool_categories")
      .insert(categoryData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: mapCategoryWriteError(error.message) }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
