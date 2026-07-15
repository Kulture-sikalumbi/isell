import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizePriceCurrency } from "@/lib/tool-pricing";
import {
  normalizeFormFields,
  syncLegacyIdentifierFromFields,
} from "@/lib/tool-form-fields";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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

export async function PATCH(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const manual = isManualFulfillment(body.fulfillment_mode);

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const formFields = normalizeFormFields(body.form_fields);
  if (formFields.length === 0) {
    return NextResponse.json(
      { error: "Add at least one checkout field with a label" },
      { status: 400 }
    );
  }
  const legacyIds = syncLegacyIdentifierFromFields(formFields);

  const updates: Record<string, unknown> = {
    category_id: body.category_id || null,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    name: body.name,
    description: body.description || null,
    download_url: (body.download_url as string)?.trim() || null,
    download_url_mac: (body.download_url_mac as string)?.trim() || null,
    ...parseActivationTimeBody(body),
    fulfillment_mode: body.fulfillment_mode || "manual",
    external_service_id: body.external_service_id || null,
    external_service_name: body.external_service_name || null,
    retail_price: body.retail_price,
    price_currency: normalizePriceCurrency(body.price_currency as string | undefined),
    wholesale_cost: body.wholesale_cost,
    form_fields: formFields,
    form_help_title: (body.form_help_title as string)?.trim() || null,
    identifier_label: legacyIds.identifier_label,
    identifier_placeholder: legacyIds.identifier_placeholder,
    identifier_instructions: body.identifier_instructions || null,
    is_active: body.is_active ?? true,
  };

  if (manual) {
    updates.developer_api_url = null;
    updates.activation_type_id = null;
    updates.developer_name = null;
  } else {
    updates.developer_api_url = body.developer_api_url || null;
    updates.activation_type_id = body.activation_type_id || null;
    updates.developer_name = body.developer_name || null;
    updates.api_config = body.api_config ?? {};
  }

  const { data, error } = await supabase
    .from("tools")
    .update(updates)
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
