import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createUserPaymentMethod,
  getUserPaymentMethods,
} from "@/lib/payment-methods";
import type { UserPaymentMethodType } from "@/types/database";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const methods = await getUserPaymentMethods(user.id);
  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const method = body.method as UserPaymentMethodType;

  const result = await createUserPaymentMethod(user.id, {
    method,
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
