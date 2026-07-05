import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserNotifications } from "@/lib/user-notifications";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await getUserNotifications(user.id);
  const unread = notifications.filter((n) => !n.read_at).length;

  return NextResponse.json({ notifications, unread });
}
