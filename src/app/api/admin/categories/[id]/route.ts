import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const sortOrder = Number(body.sort_order);
  const featuredSort = Number(body.featured_sort_order);

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const updates = {
    name: (body.name as string)?.trim(),
    description: (body.description as string)?.trim() || null,
    download_url: (body.download_url as string)?.trim() || null,
    download_url_mac: (body.download_url_mac as string)?.trim() || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_featured: Boolean(body.is_featured),
    featured_sort_order: Number.isFinite(featuredSort) ? featuredSort : 0,
    is_active: body.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tool_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, category: data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { count, error: countError } = await supabase
    .from("tools")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Remove or reassign devices before deleting this tool" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("tool_categories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
