import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { buildDeviceSlug } from "@/lib/tool-slug";
import { normalizePriceCurrency } from "@/lib/tool-pricing";
import {
  normalizeFormFields,
  syncLegacyIdentifierFromFields,
} from "@/lib/tool-form-fields";
import { slugify } from "@/lib/utils";

function parseActivationTimeBody(body: Record<string, unknown>) {
  const value = Number(body.activation_time_value);
  const unit = body.activation_time_unit as string | null;

  if (!Number.isFinite(value) || value <= 0 || !unit) {
    return { activation_time_value: null, activation_time_unit: null };
  }

  if (unit !== "minutes" && unit !== "hours" && unit !== "days") {
    return { activation_time_value: null, activation_time_unit: null };
  }

  return { activation_time_value: Math.round(value), activation_time_unit: unit };
}

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

    const formFields = normalizeFormFields(body.form_fields);
    if (formFields.length === 0) {
      return NextResponse.json(
        { error: "Add at least one checkout field with a label" },
        { status: 400 }
      );
    }
    const legacyIds = syncLegacyIdentifierFromFields(formFields);

    const toolData: Record<string, unknown> = {
      category_id: categoryId,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      slug,
      name,
      description: (body.description as string) || null,
      download_url: (body.download_url as string)?.trim() || null,
      download_url_mac: (body.download_url_mac as string)?.trim() || null,
      ...parseActivationTimeBody(body),
      fulfillment_mode: (body.fulfillment_mode as string) || "manual",
      external_service_id: (body.external_service_id as string) || null,
      external_service_name: (body.external_service_name as string) || null,
      retail_price: body.retail_price as number,
      price_currency: normalizePriceCurrency(body.price_currency as string | undefined),
      wholesale_cost: body.wholesale_cost as number,
      form_fields: formFields,
      form_help_title: (body.form_help_title as string)?.trim() || null,
      identifier_label: legacyIds.identifier_label,
      identifier_placeholder: legacyIds.identifier_placeholder,
      identifier_instructions: (body.identifier_instructions as string) || null,
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
