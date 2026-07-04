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
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("tools")
    .update({
      slug: body.slug,
      name: body.name,
      description: body.description || null,
      download_url: body.download_url || null,
      fulfillment_mode: body.fulfillment_mode || "manual",
      developer_api_url: body.developer_api_url || null,
      activation_type_id: body.activation_type_id || null,
      external_service_id: body.external_service_id || null,
      external_service_name: body.external_service_name || null,
      developer_name: body.developer_name || null,
      retail_price: body.retail_price,
      wholesale_cost: body.wholesale_cost,
      identifier_label: body.identifier_label,
      identifier_instructions: body.identifier_instructions || null,
      identifier_placeholder: body.identifier_placeholder || null,
      api_config: body.api_config ?? {},
      is_active: body.is_active ?? true,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, tool: data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { error } = await supabase.from("tools").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
