import { requireAdmin } from "@/lib/auth";
import { AdminAssistant } from "@/components/admin/admin-assistant";
import { AdminLiveOrderAlert } from "@/components/admin/admin-live-order-alert";
import { AdminRealtimeRefresh } from "@/components/admin/admin-realtime-refresh";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="min-h-screen mesh-bg">
      <AdminRealtimeRefresh />
      <AdminLiveOrderAlert />
      {children}
      <AdminAssistant />
    </div>
  );
}
