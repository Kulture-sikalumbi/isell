import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { getEmailConfigStatus } from "@/lib/email-health";

export const dynamic = "force-dynamic";

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
        hint: !status.resendConfigured
          ? "RESEND_API_KEY is missing at runtime — add it in Azure App Settings AND GitHub Actions secrets, then redeploy."
          : !status.serviceRoleConfigured
            ? "SUPABASE_SERVICE_ROLE_KEY is missing on the server."
            : !status.emailFrom
              ? "EMAIL_FROM is missing on the server."
              : "NEXT_PUBLIC_APP_URL is missing on the server.",
        ...status,
      },
      { status: 400 }
    );
  }

  const result = await sendEmail({
    to: admin.email,
    subject: "iSell Unlocks — production email test",
    html: `
      <p>If you received this on <strong>${status.appUrl}</strong>, Resend is working in production.</p>
      <p>From: ${status.emailFromFormatted}</p>
    `,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: !status.resendKeyLooksValid
          ? "RESEND_API_KEY on server is invalid — copy the exact key from Resend dashboard (starts with re_) into Azure and GitHub secrets, no quotes."
          : result.skipped || result.error || "Resend rejected the send",
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
