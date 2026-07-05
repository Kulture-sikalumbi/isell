import { createServiceClient } from "@/lib/supabase/server";
import { notifyActivationReady } from "@/lib/user-notifications";
import {
  buildDeveloperAuthHeaders,
  buildDeveloperRequestPayload,
  getNestedValue,
  parseToolApiConfig,
} from "@/lib/tool-api-config";
import type { Payment, Tool } from "@/types/database";

function generateActivationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = 4;
  const segmentLength = 4;
  const parts: string[] = [];

  for (let s = 0; s < segments; s++) {
    let segment = "";
    for (let i = 0; i < segmentLength; i++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }

  return parts.join("-");
}

export interface FulfillmentResult {
  success: boolean;
  activation?: {
    id: string;
    activation_code: string;
  };
  error?: string;
}

export async function fulfillPayment(
  payment: Payment & { tool?: Tool }
): Promise<FulfillmentResult> {
  const supabase = createServiceClient();
  if (!supabase || !payment.tool) {
    return { success: false, error: "Payment or tool not found" };
  }

  const tool = payment.tool;
  if (!tool.developer_api_url || tool.fulfillment_mode === "manual") {
    return {
      success: false,
      error: "Tool is configured for manual fulfillment",
    };
  }

  const config = parseToolApiConfig(tool.api_config);
  const requestPayload = buildDeveloperRequestPayload({
    config,
    activationTypeId: tool.activation_type_id ?? "",
    hardwareId: payment.hardware_id,
    reference: payment.provider_reference ?? payment.id,
  });

  let activationCode: string | null = null;
  let apiResponse: Record<string, unknown> = {};
  let statusCode = 0;
  let apiOk = false;

  try {
    const headers = {
      "Content-Type": "application/json",
      ...buildDeveloperAuthHeaders(config),
    };

    let response: Response;

    if (config.method === "GET") {
      const url = new URL(tool.developer_api_url);
      Object.entries(requestPayload).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
      response = await fetch(url.toString(), { method: "GET", headers });
    } else {
      response = await fetch(tool.developer_api_url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestPayload),
      });
    }

    statusCode = response.status;
    apiOk = response.ok;

    try {
      apiResponse = (await response.json()) as Record<string, unknown>;
    } catch {
      apiResponse = { error: "Non-JSON response from developer API" };
    }

    if (apiOk) {
      if (config.delivery_type === "whitelist") {
        activationCode = "DEVICE_REGISTERED";
      } else {
        const extracted = getNestedValue(apiResponse, config.response_code_path);
        if (extracted != null && String(extracted).trim()) {
          activationCode = String(extracted).trim();
        }
      }
    }
  } catch (err) {
    apiResponse = {
      error:
        err instanceof Error ? err.message : "Developer API unreachable",
    };
  }

  await supabase.from("developer_api_logs").insert({
    payment_id: payment.id,
    direction: "outbound",
    endpoint: tool.developer_api_url,
    payload: requestPayload,
    response: apiResponse,
    status_code: statusCode || null,
  });

  if (!activationCode) {
    if (config.on_api_failure === "generate_fallback") {
      activationCode = generateActivationCode();
    } else {
      return {
        success: false,
        error:
          "Developer API did not return an activation. Payment was received — contact support or retry from admin.",
      };
    }
  }

  const { data: activation, error } = await supabase
    .from("activations")
    .insert({
      user_id: payment.user_id,
      payment_id: payment.id,
      tool_id: payment.tool_id,
      hardware_id: payment.hardware_id,
      activation_code: activationCode,
    })
    .select("id, activation_code")
    .single();

  if (error || !activation) {
    return {
      success: false,
      error: error?.message || "Failed to save activation",
    };
  }

  if (payment.user_id) {
    await notifyActivationReady({
      userId: payment.user_id,
      toolName: tool.name,
      hardwareId: payment.hardware_id,
      paymentId: payment.id,
    });
  }

  return { success: true, activation };
}
