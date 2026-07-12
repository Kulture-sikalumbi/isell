import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  deleteUserPaymentMethod,
  updateUserPaymentMethod,
} from "@/lib/payment-methods";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const result = await updateUserPaymentMethod(user.id, id, {
    method: body.method,
    accountIdentifier: body.account_identifier ?? body.accountIdentifier,
    accountName: body.account_name ?? body.accountName,
    label: body.label,
    isDefault: body.is_default ?? body.isDefault,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ method: result.method });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteUserPaymentMethod(user.id, id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
