import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getEmailConfigStatus } from "@/lib/email-health";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json(getEmailConfigStatus());
}

export async function POST() {
  const admin = await getAdminUser();
  if (!admin?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const status = getEmailConfigStatus();
  if (!status.ready) {
    return NextResponse.json(
      {
        error: "Email is not fully configured on this server",
        ...status,
      },
      { status: 400 }
    );
  }

  const sent = await sendEmail({
    to: admin.email,
    subject: "iSell Unlocks — production email test",
    html: `
      <p>If you received this on <strong>${status.appUrl}</strong>, Resend is working in production.</p>
      <p>From: ${status.emailFromFormatted}</p>
    `,
  });

  if (!sent) {
    return NextResponse.json(
      {
        error: "Resend rejected the send — check Azure logs for [email] Failed",
        ...status,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    sentTo: admin.email,
    ...status,
  });
}
