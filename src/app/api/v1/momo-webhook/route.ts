import { NextResponse } from "next/server";
import {
  isMomoSmsGatewayAuthorized,
  processMomoSmsWebhook,
  type MomoSmsWebhookPayload,
} from "@/lib/momo-sms-gateway";

export async function POST(request: Request) {
  if (!isMomoSmsGatewayAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<MomoSmsWebhookPayload> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await processMomoSmsWebhook({
    transactionId: String(body.transactionId ?? ""),
    amount: Number(body.amount),
    method: body.method,
    sender: body.sender,
    senderPhone: body.senderPhone,
    senderName: body.senderName,
    rawMessage: body.rawMessage,
    receivedAt: body.receivedAt,
  });

  if (!result.ok) {
    const status =
      result.code === "invalid_payload"
        ? 400
        : result.code === "not_found"
          ? 404
          : result.code === "ambiguous"
            ? 409
            : 500;

    return NextResponse.json(
      { error: result.error, code: result.code, retryable: result.retryable ?? false },
      { status }
    );
  }

  return NextResponse.json(result);
}
