import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdminSupportMessage } from "@/lib/support-notifications";
import type { SupportMessage } from "@/types/database";

export async function getUserSupportMessages(userId: string): Promise<SupportMessage[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function sendUserSupportMessage(userId: string, body: string) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "user",
      body: trimmed,
      read_by_user_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  await notifyAdminSupportMessage({
    userId,
    userEmail: profile?.email ?? "unknown",
    userName: profile?.full_name ?? undefined,
    preview: trimmed,
  });

  return data;
}

export async function markSupportReadByUser(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  await supabase
    .from("support_messages")
    .update({ read_by_user_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("sender_role", "admin")
    .is("read_by_user_at", null);
}

export interface SupportConversation {
  user_id: string;
  email: string;
  full_name: string | null;
  last_message: string;
  last_at: string;
  unread_admin: number;
}

export async function getSupportConversations(): Promise<SupportConversation[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data: messages } = await supabase
    .from("support_messages")
    .select("*, user:profiles!support_messages_user_id_fkey(email, full_name)")
    .order("created_at", { ascending: false });

  if (!messages) return [];

  const map = new Map<string, SupportConversation>();

  for (const msg of messages) {
    const profile = msg.user as { email: string; full_name: string | null } | null;
    if (!map.has(msg.user_id)) {
      map.set(msg.user_id, {
        user_id: msg.user_id,
        email: profile?.email ?? "unknown",
        full_name: profile?.full_name ?? null,
        last_message: msg.body,
        last_at: msg.created_at,
        unread_admin: 0,
      });
    }
    if (
      msg.sender_role === "user" &&
      !msg.read_by_admin_at
    ) {
      const entry = map.get(msg.user_id)!;
      entry.unread_admin += 1;
    }
  }

  return Array.from(map.values()).map(({ unread_admin, ...rest }) => ({
    ...rest,
    unread_admin,
  }));
}

export async function sendAdminSupportMessage(userId: string, body: string) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "admin",
      body: trimmed,
      read_by_admin_at: new Date().toISOString(),
    })
    .select()
    .single();

  return error ? null : data;
}

export async function markSupportReadByAdmin(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  await supabase
    .from("support_messages")
    .update({ read_by_admin_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("sender_role", "user")
    .is("read_by_admin_at", null);
}
