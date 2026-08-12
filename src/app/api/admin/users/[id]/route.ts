import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { creditUserWalletByAdmin } from "@/lib/admin-wallet-credit";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const { role } = (await request.json()) as { role: UserRole };

  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (id === admin.id && role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin access" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}

export async function POST(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency : "";
  const note = typeof body.note === "string" ? body.note : null;

  const result = await creditUserWalletByAdmin({
    userId: id,
    amount,
    currency,
    adminNote: note,
    adminEmail: admin.email ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
