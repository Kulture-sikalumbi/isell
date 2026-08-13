"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Eye,
  Image as ImageIcon,
  Loader2,
  Reply,
  Search,
  Send,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { SupportMessage, SupportMessageTool } from "@/types/database";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SupportChatProps {
  apiBase: string;
  emptyHint?: string;
  viewerRole?: "user" | "admin";
  userId?: string;
  customerName?: string;
}

interface ContextMenuState {
  messageId: string;
  x: number;
  y: number;
  isMine: boolean;
  isDeleted: boolean;
}

interface ToolPickerTool {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  description: string | null;
  retail_price: number;
  price_currency: string;
}

// ─────────────────────────────────────────────
// Image compression helper
// ─────────────────────────────────────────────
async function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1200;
      const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas unavailable")); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Load failed")); };
    img.src = url;
  });
}

// ─────────────────────────────────────────────
// Eye status indicator
// ─────────────────────────────────────────────
function EyeStatus({ msg, viewerRole }: { msg: SupportMessage; viewerRole: "user" | "admin" }) {
  const seenAt = viewerRole === "admin" ? msg.read_by_user_at : msg.read_by_admin_at;
  if (seenAt) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
        <Eye className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]" />
        <Eye className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]" />
      </span>
    );
  }
  if (msg.delivered_at) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
        <Eye className="h-3 w-3 text-zinc-500" />
        <Eye className="h-3 w-3 text-zinc-500" />
      </span>
    );
  }
  return <Eye className="h-3 w-3 text-zinc-600 ml-1 shrink-0" />;
}

// ─────────────────────────────────────────────
// Tool card (in message)
// ─────────────────────────────────────────────
function ToolCard({ tool }: { tool: SupportMessageTool }) {
  return (
    <a
      href={`/tools/${tool.slug}`}
      className="block mt-1.5 rounded-xl border border-cyan-500/25 bg-black/40 p-2.5 hover:border-cyan-400/50 transition-colors group"
    >
      <div className="flex items-center gap-2.5">
        {tool.icon_url && (
          <img
            src={tool.icon_url}
            alt={tool.name}
            className="h-9 w-9 rounded-lg object-contain shrink-0 bg-white/5"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
            {tool.name}
          </p>
          {tool.description && (
            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{tool.description}</p>
          )}
          <p className="text-[10px] font-medium text-cyan-400 mt-0.5">
            {tool.price_currency} {tool.retail_price.toFixed(2)}
          </p>
        </div>
        <Wrench className="h-4 w-4 text-cyan-500/70 shrink-0" />
      </div>
      <p className="text-[9px] text-zinc-600 mt-1.5">Tap to view tool →</p>
    </a>
  );
}

// ─────────────────────────────────────────────
// Reply preview (inside bubble)
// ─────────────────────────────────────────────
function ReplyPreviewBubble({
  replyTo,
  viewerRole,
}: {
  replyTo: NonNullable<SupportMessage["reply_to"]>;
  viewerRole: "user" | "admin";
}) {
  const label =
    replyTo.sender_role === viewerRole
      ? "You"
      : viewerRole === "admin"
      ? "Customer"
      : "Support";
  return (
    <div className="flex gap-1.5 rounded-lg border-l-2 border-cyan-400/60 bg-white/5 px-2 py-1.5 mb-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-cyan-300 mb-0.5">{label}</p>
        <p className="text-[11px] text-zinc-400 truncate">
          {replyTo.body || (replyTo.image_url ? "📷 Photo" : "Attachment")}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Single message bubble
// ─────────────────────────────────────────────
function MessageBubble({
  msg,
  isMine,
  viewerRole,
  onContextMenu,
}: {
  msg: SupportMessage;
  isMine: boolean;
  viewerRole: "user" | "admin";
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, msg: SupportMessage) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      onContextMenu(e, msg);
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  if (msg.deleted_for_all) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[75%] rounded-2xl px-3.5 py-2 bg-white/5 border border-white/10 italic text-zinc-500 text-xs flex items-center gap-1.5">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} group`}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, msg); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-lg relative ${
          isMine
            ? "bg-gradient-to-br from-cyan-600/30 to-cyan-500/20 text-cyan-50 rounded-br-sm border border-cyan-500/20"
            : "bg-white/10 text-zinc-100 rounded-bl-sm border border-white/10"
        }`}
      >
        {/* Reply preview */}
        {msg.reply_to && (
          <ReplyPreviewBubble replyTo={msg.reply_to} viewerRole={viewerRole} />
        )}

        {/* Image */}
        {msg.image_url && (
          <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={msg.image_url}
              alt="attachment"
              className="rounded-xl max-h-64 w-full object-cover border border-white/10 hover:opacity-90 transition-opacity"
            />
          </a>
        )}

        {/* Tool card */}
        {msg.tool && <ToolCard tool={msg.tool} />}

        {/* Body text */}
        {msg.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">
            {msg.body}
          </p>
        )}

        {/* Footer: time + eye status */}
        <div className={`flex items-center gap-1 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
          <span className="text-[10px] text-zinc-500">{formatDate(msg.created_at)}</span>
          {isMine && <EyeStatus msg={msg} viewerRole={viewerRole} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Context menu
// ─────────────────────────────────────────────
function ContextMenu({
  ctx,
  onReply,
  onDeleteSelf,
  onDeleteAll,
  onClose,
}: {
  ctx: ContextMenuState;
  onReply: () => void;
  onDeleteSelf: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !menuRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  // Keep menu within viewport
  const left = Math.min(ctx.x, window.innerWidth - 200);
  const top = Math.min(ctx.y, window.innerHeight - 160);

  return (
    <div
      ref={menuRef}
      style={{ position: "fixed", left, top, zIndex: 1000 }}
      className="glass rounded-xl border border-white/10 shadow-2xl overflow-hidden min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={() => { onReply(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
      >
        <Reply className="h-3.5 w-3.5 text-cyan-400" />
        Reply
      </button>
      {ctx.isMine && !ctx.isDeleted && (
        <>
          <div className="border-t border-white/5" />
          <button
            onClick={() => { onDeleteSelf(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-zinc-400 hover:bg-white/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
            Delete for me
          </button>
          <button
            onClick={() => { onDeleteAll(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
            Delete for everyone
          </button>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tool Picker Modal
// ─────────────────────────────────────────────
function ToolPicker({
  toolsApiUrl,
  onSelect,
  onClose,
}: {
  toolsApiUrl: string;
  onSelect: (tool: ToolPickerTool) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [tools, setTools] = useState<ToolPickerTool[]>([]);
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTools = useCallback(
    (q: string) => {
      setLoading(true);
      fetch(`${toolsApiUrl}?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setTools(d.tools ?? []))
        .finally(() => setLoading(false));
    },
    [toolsApiUrl]
  );

  useEffect(() => {
    fetchTools("");
  }, [fetchTools]);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchTools(val), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Attach a Tool</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search tools…"
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : tools.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-8">No tools found</p>
          ) : (
            tools.map((t) => (
              <button
                key={t.id}
                onClick={() => { onSelect(t); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
              >
                {t.icon_url ? (
                  <img src={t.icon_url} alt={t.name} className="h-9 w-9 rounded-lg object-contain bg-white/5 shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <Wrench className="h-4 w-4 text-zinc-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-xs text-zinc-500 truncate">{t.description}</p>
                  )}
                  <p className="text-xs text-cyan-400 font-medium">
                    {t.price_currency} {t.retail_price.toFixed(2)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main SupportChat component
// ─────────────────────────────────────────────
export function SupportChat({
  apiBase,
  emptyHint = "Send a message to start the conversation.",
  viewerRole = "user",
  userId,
  customerName,
}: SupportChatProps) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Attachments
  const [pendingImage, setPendingImage] = useState<string | null>(null); // data URL
  const [pendingTool, setPendingTool] = useState<ToolPickerTool | null>(null);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Online presence
  const [otherOnline, setOtherOnline] = useState(false);

  // Clearing chat (admin)
  const [clearing, setClearing] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Derived URLs
  const toolsApiUrl =
    viewerRole === "admin"
      ? "/api/admin/support/tools"
      : "/api/support/tools";

  const deleteUrl = (msgId: string) =>
    viewerRole === "admin"
      ? `${apiBase}/${msgId}`
      : `${apiBase}/${msgId}`;

  const clearUrl =
    viewerRole === "admin"
      ? apiBase.replace(/\/messages$/, "/clear")
      : null;

  // ── Load messages ─────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(apiBase);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // ── Realtime subscription ─────────────────
  useEffect(() => {
    loadMessages();

    const supabase = createClient();
    if (!supabase || !userId) {
      // Fall back to polling
      const interval = setInterval(loadMessages, 15000);
      return () => clearInterval(interval);
    }

    // Messages realtime
    const msgChannel = supabase
      .channel(`support-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `user_id=eq.${userId}`,
        },
        () => { loadMessages(); }
      )
      .subscribe();

    // Presence for online status
    const presenceChannel = supabase.channel(`support-presence-${userId}`);
    const myRole = viewerRole;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ role: string }>();
        const otherRole = myRole === "admin" ? "user" : "admin";
        const isOtherOnline = Object.values(state).some((presences) =>
          presences.some((p) => p.role === otherRole)
        );
        setOtherOnline(isOtherOnline);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({ role: myRole, userId });
        }
      });

    return () => {
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [apiBase, userId, viewerRole, loadMessages]);

  // ── Auto-scroll ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ──────────────────────────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !pendingImage && !pendingTool) || sending) return;

    setSending(true);
    const savedInput = input;
    setInput("");

    try {
      const body: Record<string, unknown> = {};
      if (text) body.body = text;
      if (replyTo) body.reply_to_id = replyTo.id;
      if (pendingTool) body.tool_id = pendingTool.id;
      if (pendingImage) {
        body.image_data = pendingImage;
        body.image_content_type = "image/jpeg";
      }

      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.ok && data.message) {
        setMessages((prev) => {
          // Resolve reply_to inline if we have it
          const newMsg: SupportMessage = {
            ...data.message,
            reply_to: replyTo
              ? {
                  id: replyTo.id,
                  sender_role: replyTo.sender_role,
                  body: replyTo.body,
                  image_url: replyTo.image_url,
                }
              : null,
            tool: pendingTool
              ? {
                  id: pendingTool.id,
                  name: pendingTool.name,
                  slug: pendingTool.slug,
                  icon_url: pendingTool.icon_url,
                  description: pendingTool.description,
                  retail_price: pendingTool.retail_price,
                  price_currency: pendingTool.price_currency,
                }
              : data.message.tool ?? null,
          };
          return [...prev, newMsg];
        });
        setPendingImage(null);
        setPendingTool(null);
        setReplyTo(null);
      } else {
        setInput(savedInput);
      }
    } catch {
      setInput(savedInput);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // ── Handle Enter to send ──────────────────
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Image pick ────────────────────────────
  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressToDataUrl(file);
      setPendingImage(dataUrl);
    } catch {
      alert("Could not process image. Try a different file.");
    }
    e.target.value = "";
  }

  // ── Context menu ──────────────────────────
  function openContextMenu(e: React.MouseEvent | React.TouchEvent, msg: SupportMessage) {
    const isMine =
      viewerRole === "user" ? msg.sender_role === "user" : msg.sender_role === "admin";
    let x: number;
    let y: number;
    if ("touches" in e) {
      x = e.touches[0]?.clientX ?? 0;
      y = e.touches[0]?.clientY ?? 0;
    } else {
      x = (e as React.MouseEvent).clientX;
      y = (e as React.MouseEvent).clientY;
    }
    setCtxMenu({ messageId: msg.id, x, y, isMine, isDeleted: msg.deleted_for_all });
  }

  function handleReplyFromMenu() {
    const msg = messages.find((m) => m.id === ctxMenu?.messageId);
    if (msg) {
      setReplyTo(msg);
      inputRef.current?.focus();
    }
  }

  async function handleDeleteSelf() {
    const id = ctxMenu?.messageId;
    if (!id) return;
    const res = await fetch(`${deleteUrl(id)}?type=self`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleDeleteAll() {
    const id = ctxMenu?.messageId;
    if (!id) return;
    const res = await fetch(`${deleteUrl(id)}?type=all`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, deleted_for_all: true, body: null, image_url: null, tool: null } : m
        )
      );
    }
  }

  async function handleClearChat() {
    if (!clearUrl || !window.confirm("Clear entire chat history for everyone?")) return;
    setClearing(true);
    const res = await fetch(clearUrl, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) => ({ ...m, deleted_for_all: true, body: null, image_url: null, tool: null }))
      );
    }
    setClearing(false);
  }

  // ── Visible messages (filter deleted_by_sender for own messages) ───────
  const visibleMessages = messages.filter((m) => {
    if (m.deleted_for_all) return true; // show as "deleted" bubble
    const isMine =
      viewerRole === "user" ? m.sender_role === "user" : m.sender_role === "admin";
    if (isMine && m.deleted_by_sender) return false;
    return true;
  });

  // ── Render ────────────────────────────────
  if (loading) {
    return (
      <div className="glass rounded-2xl flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const canSend = !!(input.trim() || pendingImage || pendingTool);

  return (
    <>
      <div className="glass rounded-2xl flex flex-col h-[min(70vh,580px)] border border-white/10">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Avatar placeholder */}
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-cyan-300 border border-white/10">
              {(customerName || (viewerRole === "user" ? "S" : "C"))[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {customerName || (viewerRole === "user" ? "Support" : "Customer")}
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    otherOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-zinc-600"
                  }`}
                />
                <span className="text-[10px] text-zinc-500">
                  {otherOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>

          {/* Admin: clear chat */}
          {viewerRole === "admin" && clearUrl && (
            <button
              onClick={handleClearChat}
              disabled={clearing}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Clear chat"
            >
              {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Clear chat
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 scroll-smooth">
          {visibleMessages.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-10">{emptyHint}</p>
          ) : (
            visibleMessages.map((m) => {
              const isMine =
                viewerRole === "user"
                  ? m.sender_role === "user"
                  : m.sender_role === "admin";
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMine={isMine}
                  viewerRole={viewerRole}
                  onContextMenu={openContextMenu}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Reply bar ── */}
        {replyTo && (
          <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-white/5 shrink-0">
            <div className="flex-1 min-w-0 border-l-2 border-cyan-400 pl-2">
              <p className="text-[10px] font-semibold text-cyan-400 mb-0.5">
                {replyTo.sender_role === viewerRole ? "You" : (viewerRole === "admin" ? "Customer" : "Support")}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {replyTo.body || (replyTo.image_url ? "📷 Photo" : "Attachment")}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Pending image preview ── */}
        {pendingImage && (
          <div className="relative px-3 pt-2 shrink-0">
            <div className="relative inline-block">
              <img src={pendingImage} alt="Preview" className="h-20 w-20 rounded-xl object-cover border border-white/10" />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Pending tool preview ── */}
        {pendingTool && (
          <div className="flex items-center gap-2 px-3 pt-2 shrink-0">
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-black/40 px-3 py-2">
              {pendingTool.icon_url && (
                <img src={pendingTool.icon_url} alt="" className="h-7 w-7 rounded-lg object-contain bg-white/5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{pendingTool.name}</p>
                <p className="text-[10px] text-cyan-400">{pendingTool.price_currency} {pendingTool.retail_price.toFixed(2)}</p>
              </div>
              <button onClick={() => setPendingTool(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Input bar ── */}
        <form onSubmit={handleSend} className="flex items-end gap-2 px-3 py-3 border-t border-white/10 shrink-0">
          {/* Image attach */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image"
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
              pendingImage
                ? "bg-cyan-500/30 text-cyan-300"
                : "bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
          </button>

          {/* Tool attach */}
          <button
            type="button"
            onClick={() => setShowToolPicker(true)}
            title="Attach tool"
            className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
              pendingTool
                ? "bg-cyan-500/30 text-cyan-300"
                : "bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
            }`}
          >
            <Wrench className="h-4 w-4" />
          </button>

          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40 transition-colors max-h-32 overflow-y-auto leading-relaxed"
            style={{ minHeight: "36px" }}
          />

          {/* Send */}
          <Button
            type="submit"
            size="sm"
            disabled={!canSend || sending}
            className="shrink-0 h-9 w-9 p-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-40 transition-colors"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Context menu (portal-style fixed overlay) */}
      {ctxMenu && (
        <ContextMenu
          ctx={ctxMenu}
          onReply={handleReplyFromMenu}
          onDeleteSelf={handleDeleteSelf}
          onDeleteAll={handleDeleteAll}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* Tool picker modal */}
      {showToolPicker && (
        <ToolPicker
          toolsApiUrl={toolsApiUrl}
          onSelect={(t) => setPendingTool(t)}
          onClose={() => setShowToolPicker(false)}
        />
      )}
    </>
  );
}
