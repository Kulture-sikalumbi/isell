import { AdminShell } from "@/components/admin/admin-sidebar";
import { NotificationsInbox } from "@/components/admin/notifications-inbox";
import { ToolRequestsList } from "@/components/admin/tool-requests-list";
import { getAdminNotifications, getToolRequests } from "@/lib/data";

export const metadata = { title: "Inbox — Admin" };

export default async function AdminInboxPage() {
  const [notifications, toolRequests] = await Promise.all([
    getAdminNotifications(),
    getToolRequests(),
  ]);

  return (
    <AdminShell
      title="Inbox"
      description="New orders, tool requests, and alerts"
    >
      <ToolRequestsList requests={toolRequests} />
      <h2 className="text-lg font-semibold mb-4">Notifications</h2>
      <NotificationsInbox notifications={notifications} />
    </AdminShell>
  );
}
