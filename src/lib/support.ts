import { createServiceClient } from "@/lib/supabase/server";
import { notifyAdminSupportMessage } from "@/lib/support-notifications";
import type { SupportMessage } from "@/types/database";

const MESSAGE_SELECT = `
  id, user_id, sender_role, body, image_url, audio_url, tool_id,
  tool:tools!support_messages_tool_id_fkey(id, name, slug, icon_url, description, retail_price, price_currency),
  reply_to_id, deleted_for_all, deleted_by_sender, delivered_at, edited_at,
  read_by_user_at, read_by_admin_at, created_at
`.trim();

// ─── Storage helpers ──────────────────────────────────────────────────────────

/**
 * Extract the storage object path from a public Supabase storage URL.
 * e.g. "…/storage/v1/object/public/support-chat-audio/userId/123.webm"
 *      → "userId/123.webm"
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return null;
  }
}

type MsgWithMedia = { image_url?: string | null; audio_url?: string | null };

/**
 * Delete Supabase storage objects for a batch of messages.
 * Silently swallows errors — a failed storage delete must never block the DB op.
 */
async function purgeStorageFiles(
  supabase: NonNullable<ReturnType<typeof createServiceClient>>,
  messages: MsgWithMedia[]
): Promise<void> {
  const imagePaths = messages
    .map((m) => (m.image_url ? extractStoragePath(m.image_url, "support-chat-image") : null))
    .filter((p): p is string => !!p);

  const audioPaths = messages
    .map((m) => (m.audio_url ? extractStoragePath(m.audio_url, "support-chat-audio") : null))
    .filter((p): p is string => !!p);

  await Promise.all([
    imagePaths.length
      ? supabase.storage.from("support-chat-image").remove(imagePaths)
      : Promise.resolve(),
    audioPaths.length
      ? supabase.storage.from("support-chat-audio").remove(audioPaths)
      : Promise.resolve(),
  ]);
}

// ─── WhatsApp-style cleanup ───────────────────────────────────────────────────

/**
 * Hard-delete messages that are no longer needed:
 *   - Both parties have read them AND they are older than 24 hours (delivered & dropped)
 *   - OR they are older than 30 days regardless (hard TTL)
 *
 * Associated storage files (images, audio) are deleted first.
 * Called fire-and-forget on every message fetch — kept fast by DB indices.
 */
async function cleanupMessages(userId: string): Promise<void> {
  const supabase = createServiceClient();
  if (!supabase) return;

  const now = Date.now();
  const cutoff24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const cutoff30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Both-read messages older than 24 h (deliver-and-drop)
  const { data: read } = await supabase
    .from("support_messages")
    .select("id, image_url, audio_url")
    .eq("user_id", userId)
    .not("read_by_user_at", "is", null)
    .not("read_by_admin_at", "is", null)
    .lt("created_at", cutoff24h);

  // 2. Anything older than 30 days (absolute TTL)
  const { data: aged } = await supabase
    .from("support_messages")
    .select("id, image_url, audio_url")
    .eq("user_id", userId)
    .lt("created_at", cutoff30d);

  // Deduplicate by id
  const seen = new Set<string>();
  const toDelete: Array<{ id: string; image_url: string | null; audio_url: string | null }> = [];
  for (const m of [...(read ?? []), ...(aged ?? [])]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      toDelete.push(m as { id: string; image_url: string | null; audio_url: string | null });
    }
  }

  if (toDelete.length === 0) return;

  // Delete storage objects first, then rows
  await purgeStorageFiles(supabase, toDelete);
  await supabase.from("support_messages").delete().in("id", toDelete.map((m) => m.id));
}

// ─── Message processing ───────────────────────────────────────────────────────

function processMessages(messages: SupportMessage[]): SupportMessage[] {
  const map = new Map(messages.map((m) => [m.id, m]));
  return messages.map((m) => ({
    ...m,
    reply_to: m.reply_to_id
      ? map.get(m.reply_to_id)
        ? {
            id: map.get(m.reply_to_id)!.id,
            sender_role: map.get(m.reply_to_id)!.sender_role,
            body: map.get(m.reply_to_id)!.body,
            image_url: map.get(m.reply_to_id)!.image_url,
            audio_url: map.get(m.reply_to_id)!.audio_url,
          }
        : null
      : null,
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getUserSupportMessages(userId: string): Promise<SupportMessage[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  // Fire-and-forget cleanup — does not delay the response
  cleanupMessages(userId).catch(() => {});

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
  audioUrl?: string;
  toolId?: string;
  replyToId?: string;
}

export async function sendUserSupportMessage(userId: string, opts: SendOpts) {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const body = opts.body?.trim() || null;
  if (!body && !opts.imageUrl && !opts.audioUrl && !opts.toolId) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "user",
      body,
      image_url: opts.imageUrl ?? null,
      audio_url: opts.audioUrl ?? null,
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

  const preview =
    body ||
    (opts.imageUrl ? "📷 Image" : opts.audioUrl ? "🎤 Voice message" : "🔧 Tool attachment");
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
  if (!body && !opts.imageUrl && !opts.audioUrl && !opts.toolId) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      user_id: userId,
      sender_role: "admin",
      body,
      image_url: opts.imageUrl ?? null,
      audio_url: opts.audioUrl ?? null,
      tool_id: opts.toolId ?? null,
      reply_to_id: opts.replyToId ?? null,
      read_by_admin_at: new Date().toISOString(),
      deleted_for_all: false,
      deleted_by_sender: false,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) return null;

  const preview =
    body ||
    (opts.imageUrl ? "📷 Image" : opts.audioUrl ? "🎤 Voice message" : "🔧 Tool attachment");
  const { notifySupportReply } = await import("@/lib/user-notifications");
  await notifySupportReply({ userId, preview });

  return data as unknown as SupportMessage;
}

export async function markSupportReadByUser(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return;

  const now = new Date().toISOString();

  await supabase
    .from("support_messages")
    .update({ delivered_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "admin")
    .is("delivered_at", null);

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

  await supabase
    .from("support_messages")
    .update({ delivered_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "user")
    .is("delivered_at", null);

  await supabase
    .from("support_messages")
    .update({ read_by_admin_at: now })
    .eq("user_id", userId)
    .eq("sender_role", "user")
    .is("read_by_admin_at", null);
}

/**
 * Edit the text body of a message that hasn't been delivered to the
 * recipient yet. Returns the updated message, or null if the edit was
 * rejected (not found, wrong sender, already delivered, empty body).
 */
export async function editSupportMessage(
  messageId: string,
  senderRole: "user" | "admin",
  newBody: string
): Promise<SupportMessage | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  const trimmed = newBody.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("support_messages")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("sender_role", senderRole)
    .eq("deleted_for_all", false)
    .is("delivered_at", null)
    .select(MESSAGE_SELECT)
    .single();

  if (error || !data) return null;
  return data as unknown as SupportMessage;
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

  // Fetch media URLs so we can clean up storage before nulling the columns
  const { data: msg } = await supabase
    .from("support_messages")
    .select("image_url, audio_url")
    .eq("id", messageId)
    .maybeSingle();

  if (msg) {
    await purgeStorageFiles(supabase, [msg]);
  }

  const { error } = await supabase
    .from("support_messages")
    .update({
      deleted_for_all: true,
      body: null,
      image_url: null,
      audio_url: null,
      tool_id: null,
    })
    .eq("id", messageId);

  return !error;
}

export async function clearChatForAll(userId: string) {
  const supabase = createServiceClient();
  if (!supabase) return false;

  // Collect all media URLs so storage can be cleaned up
  const { data: messages } = await supabase
    .from("support_messages")
    .select("image_url, audio_url")
    .eq("user_id", userId)
    .eq("deleted_for_all", false);

  if (messages && messages.length > 0) {
    await purgeStorageFiles(supabase, messages);
  }

  const { error } = await supabase
    .from("support_messages")
    .update({
      deleted_for_all: true,
      body: null,
      image_url: null,
      audio_url: null,
      tool_id: null,
    })
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
      const lastMsg =
        msg.body ||
        (msg.image_url
          ? "📷 Image"
          : msg.audio_url
          ? "🎤 Voice message"
          : msg.tool_id
          ? "🔧 Tool"
          : "Message");
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
  if (!supabase) return null;

  try {
    const filePath = `chat/${userId}/${Date.now()}.jpg`;
    const buffer = Buffer.from(base64Data, "base64");

    const { error } = await supabase.storage
      .from("support-chat-image")
      .upload(filePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error("[ImageUpload] Failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("support-chat-image")
      .getPublicUrl(filePath);
    return urlData?.publicUrl ?? null;
  } catch (err) {
    console.error("[ImageUpload] Exception:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export async function uploadSupportChatAudio(
  userId: string,
  base64Data: string,
  contentType: string
): Promise<string | null> {
  const supabase = createServiceClient();
  if (!supabase) return null;

  try {
    const ext = contentType.includes("ogg") ? "ogg" : "webm";
    const filePath = `${userId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(base64Data, "base64");

    const { error } = await supabase.storage
      .from("support-chat-audio")
      .upload(filePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error("[AudioUpload] Failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("support-chat-audio")
      .getPublicUrl(filePath);
    return urlData?.publicUrl ?? null;
  } catch (err) {
    console.error("[AudioUpload] Exception:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
