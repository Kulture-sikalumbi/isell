import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdminSupportMessage } from "@/lib/support-notifications";
import type { SupportMessage } from "@/types/database";

const MESSAGE_SELECT = `
  id, user_id, sender_role, body, image_url, tool_id,
  tool:tools!support_messages_tool_id_fkey(id, name, slug, icon_url, description, retail_price, price_currency),
  reply_to_id, deleted_for_all, deleted_by_sender, delivered_at,
  read_by_user_at, read_by_admin_at, created_at
`.trim();

function processMessages(messages: SupportMessage[]): SupportMessage[] {
  // Attach reply_to data from within the same message list
  const map = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => ({
    ...m,
    reply_to: m.reply_to_id ? (map.get(m.reply_to_id) ? {
      id: map.get(m.reply_to_id)!.id,
      sender_role: map.get(m.reply_to_id)!.sender_role,
      body: map.get(m.reply_to_id)!.body,
      image_url: map.get(m.reply_to_id)!.image_url,
    } : null) : null,
  }));
}

export async function getUserSupportMessages(userId: string): Promise<SupportMessage[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("support_messages")
    .select(MESSAGE_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return processMessages((data as unknown as SupportMessage[]) ?? []);
}

interface SendOpts {
  body?: string;
  imageUrl?: string;
  toolId?: string;
  replyToId?: string;
}

export async function sendUserSupportMessage(userId: string, opts: SendOpts) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const body = opts.body?.trim() || null;
  if (!body && !opts.imageUrl && !opts.toolId) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "user",
      body,
      image_url: opts.imageUrl ?? null,
      tool_id: opts.toolId ?? null,
      reply_to_id: opts.replyToId ?? null,
      read_by_user_at: new Date().toISOString(),
      deleted_for_all: false,
      deleted_by_sender: false,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .single();

  const preview = body || (opts.imageUrl ? "📷 Image" : "🔧 Tool attachment");
  await notifyAdminSupportMessage({
    userId,
    userEmail: profile?.email ?? "unknown",
    userName: profile?.full_name ?? undefined,
    preview,
  });

  return data as unknown as SupportMessage;
}

export async function sendAdminSupportMessage(userId: string, opts: SendOpts) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const body = opts.body?.trim() || null;
  if (!body && !opts.imageUrl && !opts.toolId) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "admin",
      body,
      image_url: opts.imageUrl ?? null,
      tool_id: opts.toolId ?? null,
      reply_to_id: opts.replyToId ?? null,
      read_by_admin_at: new Date().toISOString(),
      deleted_for_all: false,
      deleted_by_sender: false,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) return null;

  const preview = body || (opts.imageUrl ? "📷 Image" : "🔧 Tool attachment");
  const { notifySupportReply } = await import("@/lib/user-notifications");
  await notifySupportReply({ userId, preview });

  return data as unknown as SupportMessage;
}

export async function markSupportReadByUser(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  // Mark admin messages as delivered (if not yet)
  await supabase
    .from("support_messages")
    .update({ delivered_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "admin")
    .is("delivered_at", null);

  // Mark admin messages as read/seen
  await supabase
    .from("support_messages")
    .update({ read_by_user_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "admin")
    .is("read_by_user_at", null);
}

export async function markSupportReadByAdmin(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  // Mark user messages as delivered (if not yet)
  await supabase
    .from("support_messages")
    .update({ delivered_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "user")
    .is("delivered_at", null);

  // Mark user messages as read/seen
  await supabase
    .from("support_messages")
    .update({ read_by_admin_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "user")
    .is("read_by_admin_at", null);
}

export async function deleteMessageForSender(messageId: string) {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_messages")
    .update({ deleted_by_sender: true })
    .eq("id", messageId);

  return !error;
}

export async function deleteMessageForAll(messageId: string) {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_messages")
    .update({ deleted_for_all: true, body: null, image_url: null, tool_id: null })
    .eq("id", messageId);

  return !error;
}

export async function clearChatForAll(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("support_messages")
    .update({ deleted_for_all: true, body: null, image_url: null, tool_id: null })
    .eq("user_id", userId);

  return !error;
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
    .eq("deleted_for_all", false)
    .order("created_at", { ascending: false });

  if (!messages) return [];

  const map = new Map<string, SupportConversation>();

  for (const msg of messages) {
    const profile = msg.user as { email: string; full_name: string | null } | null;
    if (!map.has(msg.user_id)) {
      const lastMsg = msg.body || (msg.image_url ? "📷 Image" : msg.tool_id ? "🔧 Tool" : "Message");
      map.set(msg.user_id, {
        user_id: msg.user_id,
        email: profile?.email ?? "unknown",
        full_name: profile?.full_name ?? null,
        last_message: lastMsg,
        last_at: msg.created_at,
        unread_admin: 0,
      });
    }
    if (msg.sender_role === "user" && !msg.read_by_admin_at) {
      const entry = map.get(msg.user_id)!;
      entry.unread_admin += 1;
    }
  }

  return Array.from(map.values()).map(({ unread_admin, ...rest }) => ({
    ...rest,
    unread_admin,
  }));
}

export async function getUnreadSupportMessageCount(): Promise<number> {
  const supabase = createServiceClient();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_role", "user")
    .is("read_by_admin_at", null);

  return count ?? 0;
}

export async function uploadSupportChatImage(
  userId: string,
  base64Data: string,
  contentType: string
): Promise<string | null> {
  const supabase = createServiceClient();
  if (!supabase) {
    console.error("[Upload] No Supabase client");
    return null;
  }

  try {
    const filePath = `chat/${userId}/${Date.now()}.jpg`;
    const buffer = Buffer.from(base64Data, "base64");

    console.log("[Upload] Starting...", { userId, filePath, size: buffer.length, contentType });

    const { data, error } = await supabase.storage
      .from("support-chat-images")
      .upload(filePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error("[Upload] Failed:", error.message);
      return null;
    }

    console.log("[Upload] Success:", data);

    const { data: urlData } = supabase.storage.from("support-chat-images").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
    console.log("[Upload] Public URL:", publicUrl);
    return publicUrl;
  } catch (err) {
    console.error("[Upload] Exception:", err);
    return null;
  }
}
