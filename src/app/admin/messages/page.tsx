import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-sidebar";
import { AdminSupportInbox } from "@/components/admin/admin-support-inbox";

export const metadata = { title: "Messages — Admin" };

export default function AdminMessagesPage() {
  return (
    <AdminShell
      title="Customer messages"
      description="Chat with customers who need help"
    >
      <Suspense fallback={<div className="text-zinc-500">Loading…</div>}>
        <AdminSupportInbox />
      </Suspense>
    </AdminShell>
  );
}
