import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteMessageForAll, deleteMessageForSender } from "@/lib/support";
import { createServiceClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "self";

  // Verify the message belongs to this user
  const supabase = createServiceClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: msg } = await supabase
    .from("support_messages")
    .select("id, user_id, sender_role")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (msg.sender_role !== "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (type === "all") {
    await deleteMessageForAll(id);
  } else {
    await deleteMessageForSender(id);
  }

  return NextResponse.json({ success: true });
}
