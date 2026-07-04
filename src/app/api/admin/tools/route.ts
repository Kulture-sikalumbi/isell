import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const toolData = {
      slug: body.slug as string,
      name: body.name as string,
      description: (body.description as string) || null,
      download_url: (body.download_url as string) || null,
      fulfillment_mode: (body.fulfillment_mode as string) || "manual",
      developer_api_url: (body.developer_api_url as string) || null,
      activation_type_id: (body.activation_type_id as string) || null,
      external_service_id: (body.external_service_id as string) || null,
      external_service_name: (body.external_service_name as string) || null,
      developer_name: (body.developer_name as string) || null,
      retail_price: body.retail_price as number,
      wholesale_cost: body.wholesale_cost as number,
      identifier_label: (body.identifier_label as string) || "IMEI",
      identifier_instructions: (body.identifier_instructions as string) || null,
      identifier_placeholder: (body.identifier_placeholder as string) || null,
      api_config: body.api_config ?? {},
      is_active: body.is_active ?? true,
    };

    const { data, error } = await supabase
      .from("tools")
      .insert(toolData)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tool: data });
  } catch {
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}
