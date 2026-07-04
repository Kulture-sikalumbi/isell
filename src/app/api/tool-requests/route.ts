import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyAdminToolRequest } from "@/lib/tool-requests";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const requestedName = (body.requestedName as string)?.trim();

    if (!requestedName || requestedName.length < 2) {
      return NextResponse.json({ error: "Tool name is required" }, { status: 400 });
    }

    const user = await getCurrentUser();
    const notes = (body.notes as string)?.trim() || undefined;

    const toolRequest = await notifyAdminToolRequest({
      requestedName,
      notes,
      userEmail: user?.email ?? (body.email as string) ?? undefined,
      userId: user?.id,
    });

    if (!toolRequest) {
      return NextResponse.json({ error: "Could not save request" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message:
        "Request sent! The admin has been notified. Check back at /tools in a few hours.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
