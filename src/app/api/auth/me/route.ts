import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ loggedIn: false });
  }
  return NextResponse.json({
    loggedIn: true,
    email: user.email ?? undefined,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      undefined,
  });
}
