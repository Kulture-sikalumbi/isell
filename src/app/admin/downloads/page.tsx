import { AdminShell } from "@/components/admin/admin-sidebar";
import { SmsGatewayDownloadPanel } from "@/components/admin/sms-gateway-download-panel";

export const metadata = { title: "Downloads — Admin" };

export default function AdminDownloadsPage() {
  return (
    <AdminShell
      title="Downloads"
      description="Admin-only apps and tools — not visible to customers"
    >
      <div className="max-w-2xl space-y-6">
        <SmsGatewayDownloadPanel />
      </div>
    </AdminShell>
  );
}
