import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { deleteMessageForAll, deleteMessageForSender } from "@/lib/support";
import { createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ userId: string; id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { userId, id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "self";

  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: msg } = await supabase
    .from("support_messages")
    .select("id, user_id, sender_role")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (type === "all") {
    await deleteMessageForAll(id);
  } else {
    // Admin deletes for self (admin sender only)
    if (msg.sender_role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await deleteMessageForSender(id);
  }

  return NextResponse.json({ success: true });
}
