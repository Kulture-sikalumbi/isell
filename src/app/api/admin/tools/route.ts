import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { buildDeviceSlug } from "@/lib/tool-slug";
import { slugify } from "@/lib/utils";

function isManualFulfillment(mode: unknown) {
  return (mode as string) !== "direct_api";
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const manual = isManualFulfillment(body.fulfillment_mode);
    const name = (body.name as string)?.trim();
    const categoryId = (body.category_id as string) || null;

    if (!name) {
      return NextResponse.json({ error: "Device name is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    let slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) {
      if (categoryId) {
        const { data: category } = await supabase
          .from("tool_categories")
          .select("slug")
          .eq("id", categoryId)
          .single();
        slug = buildDeviceSlug(category?.slug ?? "", name);
      } else {
        slug = slugify(name);
      }
    }

    const toolData: Record<string, unknown> = {
      category_id: categoryId,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      slug,
      name,
      description: (body.description as string) || null,
      download_url: (body.download_url as string) || null,
      fulfillment_mode: (body.fulfillment_mode as string) || "manual",
      external_service_id: (body.external_service_id as string) || null,
      external_service_name: (body.external_service_name as string) || null,
      retail_price: body.retail_price as number,
      wholesale_cost: body.wholesale_cost as number,
      identifier_label: (body.identifier_label as string) || "IMEI",
      identifier_instructions: (body.identifier_instructions as string) || null,
      identifier_placeholder: (body.identifier_placeholder as string) || null,
      is_active: body.is_active ?? true,
    };

    if (manual) {
      toolData.developer_api_url = null;
      toolData.activation_type_id = null;
      toolData.developer_name = null;
    } else {
      toolData.developer_api_url = (body.developer_api_url as string) || null;
      toolData.activation_type_id = (body.activation_type_id as string) || null;
      toolData.developer_name = (body.developer_name as string) || null;
      toolData.api_config = body.api_config ?? {};
    }

    const { data, error } = await supabase.from("tools").insert(toolData).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, tool: data });
  } catch {
    return NextResponse.json({ error: "Failed to create tool" }, { status: 500 });
  }
}
