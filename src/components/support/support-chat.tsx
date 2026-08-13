"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Mic,
  Pencil,
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
import { MessageBubble } from "./message-bubble";
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
  canEdit: boolean;
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
  const preview =
    replyTo.body ||
    (replyTo.image_url ? "📷 Photo" : replyTo.audio_url ? "🎤 Voice message" : "Attachment");
  return (
    <div className="flex gap-1.5 rounded-lg border-l-2 border-cyan-400/60 bg-white/5 px-2 py-1.5 mb-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-cyan-300 mb-0.5">{label}</p>
        <p className="text-[11px] text-zinc-400 truncate">{preview}</p>
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
  onEdit,
  onDeleteSelf,
  onDeleteAll,
  onClose,
}: {
  ctx: ContextMenuState;
  onReply: () => void;
  onEdit: () => void;
  onDeleteSelf: () => void;
  onDeleteAll: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    let left = ctx.x;
    let top = ctx.y;
    const menuWidth = 200;
    const menuHeight = 150;
    if (top + menuHeight > window.innerHeight - 10) top = Math.max(10, ctx.y - menuHeight - 10);
    if (top < 10) top = Math.max(10, ctx.y + 40);
    if (left + menuWidth > window.innerWidth - 10) left = Math.max(10, left - menuWidth - 10);
    return { left: Math.max(10, left), top: Math.max(10, top) };
  };

  const { left, top } = calculatePosition();

  useEffect(() => {
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (menuRef.current && e instanceof MouseEvent) {
        if (!menuRef.current.contains(e.target as Node)) onClose();
      } else if (e instanceof KeyboardEvent && e.key === "Escape") {
        onClose();
      }
    };
    setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", handler);
    }, 50);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      style={{ position: "fixed", left: `${left}px`, top: `${top}px`, zIndex: 9999 }}
      className="bg-zinc-900 border border-zinc-700 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden min-w-40 w-max animate-in fade-in zoom-in-95 duration-150 max-w-xs"
    >
      <button
        onClick={() => { onReply(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-zinc-100 hover:bg-cyan-500/20 transition-colors whitespace-nowrap active:bg-cyan-500/30"
      >
        <Reply className="h-4 w-4 text-cyan-400 shrink-0" />
        <span>Reply</span>
      </button>
      {ctx.canEdit && (
        <>
          <div className="border-t border-zinc-700" />
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-zinc-100 hover:bg-cyan-500/20 transition-colors whitespace-nowrap active:bg-cyan-500/30"
          >
            <Pencil className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Edit</span>
          </button>
        </>
      )}
      {ctx.isMine && !ctx.isDeleted && (
        <>
          <div className="border-t border-zinc-700" />
          <button
            onClick={() => { onDeleteSelf(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-zinc-300 hover:bg-zinc-800/80 transition-colors whitespace-nowrap active:bg-zinc-800"
          >
            <Trash2 className="h-4 w-4 text-zinc-500 shrink-0" />
            <span>Delete for me</span>
          </button>
          <button
            onClick={() => { onDeleteAll(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-red-300 hover:bg-red-500/20 transition-colors whitespace-nowrap"
          >
            <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
            <span>Delete for all</span>
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

  useEffect(() => { fetchTools(""); }, [fetchTools]);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => fetchTools(val), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Attach a Tool</span>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
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
// Voice recording helpers
// ─────────────────────────────────────────────
function formatRecordingTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function bestMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
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
  const [sendingStatus, setSendingStatus] = useState<Record<string, { pending: boolean; error?: string }>>({});

  // Attachments
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingTool, setPendingTool] = useState<ToolPickerTool | null>(null);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);

  // Editing
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Context menu
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);

  // Online presence
  const [otherOnline, setOtherOnline] = useState(false);

  // Clearing chat (admin)
  const [clearing, setClearing] = useState(false);

  // Error message
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Voice recording ──────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [hasMicSupport, setHasMicSupport] = useState(false);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartXRef = useRef(0);
  const recordingCancelledRef = useRef(false);
  const permissionGrantedRef = useRef(false);

  useEffect(() => {
    setHasMicSupport(
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices !== "undefined" &&
      typeof MediaRecorder !== "undefined"
    );
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Derived URLs
  const toolsApiUrl =
    viewerRole === "admin"
      ? "/api/admin/support/tools"
      : "/api/support/tools";

  const deleteUrl = (msgId: string) => `${apiBase}/${msgId}`;

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
      const interval = setInterval(loadMessages, 15000);
      return () => clearInterval(interval);
    }

    const msgChannel = supabase
      .channel(`support-messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${userId}` },
        () => { loadMessages(); }
      )
      .subscribe();

    const presenceChannel = supabase.channel(`support-presence-${userId}`);
    const myRole = viewerRole;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState<{ role: string }>();
        const otherRole = myRole === "admin" ? "user" : "admin";
        setOtherOnline(Object.values(state).some((presences) =>
          presences.some((p) => p.role === otherRole)
        ));
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

  // ── Send text/image/tool ──────────────────
  // ── Edit an existing message ────────────
  async function handleSaveEdit(id: string) {
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiBase}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...data.message } : m))
        );
        setEditingMessageId(null);
        setInput("");
      } else {
        setErrorMessage(data.error || "Could not save edit");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setSending(false);
    }
  }

  // ── Send text/image/tool ────────────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (editingMessageId) {
      await handleSaveEdit(editingMessageId);
      return;
    }
    const text = input.trim();
    if ((!text && !pendingImage && !pendingTool) || sending) return;

    const tempId = `temp-${Date.now()}`;
    const savedInput = input;
    const savedReplyTo = replyTo;
    const savedPendingImage = pendingImage;
    const savedPendingTool = pendingTool;

    setInput("");
    setPendingImage(null);
    setPendingTool(null);
    setReplyTo(null);
    setErrorMessage(null);
    setSending(true);

    const optimisticMsg: SupportMessage = {
      id: tempId,
      user_id: userId || "",
      sender_role: viewerRole as "user" | "admin",
      body: text || null,
      image_url: savedPendingImage ?? null,
      audio_url: null,
      tool_id: savedPendingTool?.id || null,
      tool: savedPendingTool
        ? {
            id: savedPendingTool.id,
            name: savedPendingTool.name,
            slug: savedPendingTool.slug,
            icon_url: savedPendingTool.icon_url,
            description: savedPendingTool.description,
            retail_price: savedPendingTool.retail_price,
            price_currency: savedPendingTool.price_currency,
          }
        : null,
      reply_to_id: savedReplyTo?.id || null,
      reply_to: savedReplyTo
        ? {
            id: savedReplyTo.id,
            sender_role: savedReplyTo.sender_role,
            body: savedReplyTo.body,
            image_url: savedReplyTo.image_url,
            audio_url: savedReplyTo.audio_url,
          }
        : null,
      deleted_for_all: false,
      deleted_by_sender: false,
      delivered_at: null,
      edited_at: null,
      read_by_user_at: null,
      read_by_admin_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: true } }));

    (async () => {
      try {
        const body: Record<string, unknown> = {};
        if (text) body.body = text;
        if (savedReplyTo) body.reply_to_id = savedReplyTo.id;
        if (savedPendingTool) body.tool_id = savedPendingTool.id;
        if (savedPendingImage) {
          body.image_data = savedPendingImage;
          body.image_content_type = "image/jpeg";
        }

        const res = await fetch(apiBase, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();

        if (res.ok && data.message) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...data.message,
                    reply_to: savedReplyTo
                      ? {
                          id: savedReplyTo.id,
                          sender_role: savedReplyTo.sender_role,
                          body: savedReplyTo.body,
                          image_url: savedReplyTo.image_url,
                          audio_url: savedReplyTo.audio_url,
                        }
                      : null,
                    tool: savedPendingTool
                      ? {
                          id: savedPendingTool.id,
                          name: savedPendingTool.name,
                          slug: savedPendingTool.slug,
                          icon_url: savedPendingTool.icon_url,
                          description: savedPendingTool.description,
                          retail_price: savedPendingTool.retail_price,
                          price_currency: savedPendingTool.price_currency,
                        }
                      : data.message.tool ?? null,
                  }
                : m
            )
          );
          setSendingStatus((prev) => {
            const { [tempId]: _, ...rest } = prev;
            return rest;
          });
          if (data.warning) {
            setErrorMessage(data.warning);
            setTimeout(() => setErrorMessage(null), 5000);
          }
        } else {
          const errorMsg = data.error || "Failed to send message";
          setErrorMessage(errorMsg);
          setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: false, error: errorMsg } }));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        setErrorMessage(errorMsg);
        setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: false, error: errorMsg } }));
      } finally {
        setSending(false);
      }
    })();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Max 5 MB.");
      e.target.value = "";
      return;
    }
    try {
      const dataUrl = await compressToDataUrl(file);
      setPendingImage(dataUrl);
    } catch (err) {
      console.error("Image compression failed:", err);
      alert("Could not process image. Try a different file.");
    }
    e.target.value = "";
  }

  // ── Context menu ──────────────────────────
  function openContextMenu(e: React.MouseEvent | React.TouchEvent, msg: SupportMessage) {
    const isMine =
      viewerRole === "user" ? msg.sender_role === "user" : msg.sender_role === "admin";
    const button = e.currentTarget as HTMLElement;
    const rect = button.getBoundingClientRect();
    let x: number, y: number;
    if (!isMine) {
      x = rect.right + 8;
      y = rect.top;
    } else {
      x = rect.right - 12;
      y = rect.top - 150;
    }
    const canEdit =
      isMine &&
      !msg.deleted_for_all &&
      !msg.delivered_at &&
      !!msg.body &&
      !msg.id.startsWith("temp-");
    setCtxMenu({ messageId: msg.id, x, y, isMine, isDeleted: msg.deleted_for_all, canEdit });
  }

  function handleReplyFromMenu() {
    const msg = messages.find((m) => m.id === ctxMenu?.messageId);
    if (msg) {
      setReplyTo(msg);
      inputRef.current?.focus();
    }
  }

  function handleEditFromMenu() {
    const msg = messages.find((m) => m.id === ctxMenu?.messageId);
    if (msg && msg.body) {
      setEditingMessageId(msg.id);
      setInput(msg.body);
      setReplyTo(null);
      setPendingImage(null);
      setPendingTool(null);
      inputRef.current?.focus();
    }
  }

  function cancelEditing() {
    setEditingMessageId(null);
    setInput("");
  }

  async function handleDeleteSelf() {
    const id = ctxMenu?.messageId;
    if (!id) return;
    const res = await fetch(`${deleteUrl(id)}?type=self`, { method: "DELETE" });
    if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleDeleteAll() {
    const id = ctxMenu?.messageId;
    if (!id) return;
    const res = await fetch(`${deleteUrl(id)}?type=all`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, deleted_for_all: true, body: null, image_url: null, audio_url: null, tool: null }
            : m
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
        prev.map((m) => ({ ...m, deleted_for_all: true, body: null, image_url: null, audio_url: null, tool: null }))
      );
    }
    setClearing(false);
  }

  // ── Voice recording ───────────────────────
  async function handleMicPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (isRecording) return;
    recordingStartXRef.current = e.clientX;
    recordingCancelledRef.current = false;
    permissionGrantedRef.current = false;

    const button = e.currentTarget;
    const pointerId = e.pointerId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // If user released pointer or slid away before permission resolved, abort
      if (recordingCancelledRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      permissionGrantedRef.current = true;
      try { button.setPointerCapture(pointerId); } catch { /* ok */ }

      const mimeType = bestMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 599) {
            // Auto-send at 10 minutes
            stopAndSendRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setErrorMessage("Microphone access denied. Please allow microphone in your browser settings.");
      setTimeout(() => setErrorMessage(null), 5000);
    }
  }

  function handleMicPointerMove(e: React.PointerEvent) {
    const dx = e.clientX - recordingStartXRef.current;
    if (dx < -60) recordingCancelledRef.current = true;
  }

  function handleMicPointerUp() {
    if (!isRecording) {
      // Permission still pending — user released early, mark cancelled so start aborts
      recordingCancelledRef.current = true;
      return;
    }
    if (recordingCancelledRef.current) {
      cancelRecording();
    } else {
      stopAndSendRecording();
    }
  }

  function cancelRecording() {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (mr) {
      mr.ondataavailable = null;
      mr.onstop = null;
      try { mr.stop(); } catch { /* ok */ }
      try { mr.stream.getTracks().forEach((t) => t.stop()); } catch { /* ok */ }
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingCancelledRef.current = false;
    permissionGrantedRef.current = false;
  }

  function stopAndSendRecording() {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    const durationSecs = recordingSeconds;

    mr.onstop = () => {
      const mimeType = mr.mimeType || "audio/webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });

      try { mr.stream.getTracks().forEach((t) => t.stop()); } catch { /* ok */ }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingSeconds(0);
      recordingCancelledRef.current = false;
      permissionGrantedRef.current = false;

      // Discard if too short (tiny tap or near-silent)
      if (blob.size < 500 || durationSecs < 1) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        doSendAudio(reader.result as string, mimeType);
      };
      reader.readAsDataURL(blob);
    };

    try { mr.stop(); } catch { /* ok */ }
  }

  function doSendAudio(dataUrl: string, mimeType: string) {
    const tempId = `temp-audio-${Date.now()}`;

    const optimisticMsg: SupportMessage = {
      id: tempId,
      user_id: userId || "",
      sender_role: viewerRole as "user" | "admin",
      body: null,
      image_url: null,
      audio_url: dataUrl, // local blob URL for instant playback
      tool_id: null,
      tool: null,
      reply_to_id: null,
      reply_to: null,
      deleted_for_all: false,
      deleted_by_sender: false,
      delivered_at: null,
      edited_at: null,
      read_by_user_at: null,
      read_by_admin_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: true } }));

    fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio_data: dataUrl, audio_content_type: mimeType }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.message) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data.message : m)));
          setSendingStatus((prev) => { const { [tempId]: _, ...rest } = prev; return rest; });
          if (data.warning) {
            setErrorMessage(data.warning);
            setTimeout(() => setErrorMessage(null), 5000);
          }
        } else {
          const errorMsg = data.error || "Failed to send voice note";
          setErrorMessage(errorMsg);
          setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: false, error: errorMsg } }));
        }
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : "Network error";
        setErrorMessage(errorMsg);
        setSendingStatus((prev) => ({ ...prev, [tempId]: { pending: false, error: errorMsg } }));
      });
  }

  // ── Visible messages ──────────────────────
  const visibleMessages = messages.filter((m) => {
    if (m.deleted_for_all) return true;
    const isMine =
      viewerRole === "user" ? m.sender_role === "user" : m.sender_role === "admin";
    if (isMine && m.deleted_by_sender) return false;
    return true;
  });

  const showMicButton = !editingMessageId && hasMicSupport && !input.trim() && !pendingImage && !pendingTool;
  const canSend = editingMessageId
    ? !!input.trim() && !sending
    : !!(input.trim() || pendingImage || pendingTool) && !sending;

  // ── Render ────────────────────────────────
  if (loading) {
    return (
      <div className="glass rounded-2xl flex items-center justify-center h-96 sm:h-[500px] md:h-[600px] w-full">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <>
      <div className="glass rounded-2xl flex flex-col border border-white/10 w-full h-full overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0 md:px-6 md:py-4 lg:px-8 lg:py-5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-cyan-300 border border-white/10 shrink-0">
              {(customerName || (viewerRole === "user" ? "S" : "C"))[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {customerName || (viewerRole === "user" ? "Support" : "Customer")}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    otherOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" : "bg-zinc-600"
                  }`}
                />
                {otherOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {viewerRole === "admin" && clearUrl && (
            <button
              onClick={handleClearChat}
              disabled={clearing}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              title="Clear chat"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 scroll-smooth md:px-6 md:py-6 lg:px-8 lg:py-8">
          {visibleMessages.length === 0 ? (
            <p className="text-center text-sm text-zinc-500 py-10">{emptyHint}</p>
          ) : (
            visibleMessages.map((m) => {
              const isMine =
                viewerRole === "user" ? m.sender_role === "user" : m.sender_role === "admin";
              const status = sendingStatus[m.id];
              return (
                <MessageBubble
                  key={m.id}
                  msg={m}
                  isMine={isMine}
                  viewerRole={viewerRole}
                  onContextMenu={openContextMenu}
                  isSending={status?.pending}
                  sendError={status?.error}
                  onReplyPreview={
                    m.reply_to ? (
                      <ReplyPreviewBubble replyTo={m.reply_to} viewerRole={viewerRole} />
                    ) : undefined
                  }
                  onToolCard={m.tool ? <ToolCard tool={m.tool} /> : undefined}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* ── Editing banner ── */}
        {editingMessageId && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/10 bg-cyan-500/10 shrink-0 md:px-6 lg:px-8">
            <div className="flex-1 min-w-0 border-l-2 border-cyan-400 pl-2">
              <p className="text-[10px] sm:text-xs font-semibold text-cyan-400 mb-0.5">Editing message</p>
              <p className="text-xs text-zinc-400 truncate">Only unread messages can be edited</p>
            </div>
            <button onClick={cancelEditing} className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Reply bar ── */}
        {!editingMessageId && replyTo && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/10 bg-white/5 shrink-0 md:px-6 lg:px-8">
            <div className="flex-1 min-w-0 border-l-2 border-cyan-400 pl-2">
              <p className="text-[10px] sm:text-xs font-semibold text-cyan-400 mb-0.5">
                {replyTo.sender_role === viewerRole ? "You" : (viewerRole === "admin" ? "Customer" : "Support")}
              </p>
              <p className="text-xs text-zinc-400 truncate">
                {replyTo.body || (replyTo.image_url ? "📷 Photo" : replyTo.audio_url ? "🎤 Voice message" : "Attachment")}
              </p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-zinc-500 hover:text-white transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Pending image preview ── */}
        {pendingImage && (
          <div className="relative px-4 pt-2 shrink-0 md:px-6 lg:px-8">
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
          <div className="flex items-center gap-2 px-4 pt-2 shrink-0 md:px-6 lg:px-8">
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

        {/* ── Error message ── */}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/50 text-sm text-red-300 flex items-center justify-between gap-2 shrink-0 md:px-6 lg:px-8">
            <span className="flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300 transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Input bar ── */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 px-4 py-3 border-t border-white/10 shrink-0 md:px-6 md:py-4 lg:px-8 lg:py-5"
        >
          {/* Image + tool buttons — hidden while recording or editing */}
          {!isRecording && !editingMessageId && (
            <>
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
                className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  pendingImage
                    ? "bg-cyan-500/30 text-cyan-300"
                    : "bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                }`}
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setShowToolPicker(true)}
                title="Attach tool"
                className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                  pendingTool
                    ? "bg-cyan-500/30 text-cyan-300"
                    : "bg-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"
                }`}
              >
                <Wrench className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Text input OR recording indicator */}
          {isRecording ? (
            <div className="flex-1 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5">
              {/* Cancel button */}
              <button
                type="button"
                onClick={cancelRecording}
                className="shrink-0 text-red-400 hover:text-red-300 transition-colors"
                title="Cancel recording"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Slide hint */}
              <span className="flex-1 text-xs text-zinc-500 text-center select-none">
                ← slide to cancel
              </span>
              {/* Pulsing dot + timer */}
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-sm font-mono text-zinc-200 shrink-0 tabular-nums">
                {formatRecordingTime(recordingSeconds)}
              </span>
            </div>
          ) : (
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/40 transition-colors max-h-32 overflow-y-auto leading-relaxed"
              style={{ minHeight: "44px" }}
            />
          )}

          {/* Send button OR mic button */}
          {showMicButton ? (
            <button
              ref={micButtonRef}
              type="button"
              onPointerDown={handleMicPointerDown}
              onPointerMove={handleMicPointerMove}
              onPointerUp={handleMicPointerUp}
              onPointerCancel={cancelRecording}
              style={{ touchAction: "none" }}
              title={isRecording ? "Release to send" : "Hold to record voice note"}
              className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-all select-none ${
                isRecording
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/40 scale-110"
                  : "bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 active:scale-95"
              }`}
            >
              <Mic className={`h-5 w-5 ${isRecording ? "animate-pulse" : ""}`} />
            </button>
          ) : (
            <Button
              type="submit"
              size="sm"
              disabled={!canSend}
              title={editingMessageId ? "Save edit" : "Send"}
              className="shrink-0 h-10 w-10 p-0 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black disabled:opacity-40 transition-all"
            >
              {editingMessageId ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          )}
        </form>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <ContextMenu
          ctx={ctxMenu}
          onReply={handleReplyFromMenu}
          onEdit={handleEditFromMenu}
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
