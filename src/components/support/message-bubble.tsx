"use client";

import { useRef, useState } from "react";
import { Eye, MoreVertical, Pause, Play } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { SupportMessage } from "@/types/database";

interface MessageBubbleProps {
  msg: SupportMessage;
  isMine: boolean;
  viewerRole: "user" | "admin";
  onContextMenu: (e: React.MouseEvent | React.TouchEvent, msg: SupportMessage) => void;
  onReplyPreview?: React.ReactNode;
  onToolCard?: React.ReactNode;
  isSending?: boolean;
  sendError?: string;
}

// ─── Voice player ─────────────────────────────────────────────────────────────
const WAVEFORM = [3, 5, 8, 4, 9, 6, 10, 7, 5, 8, 10, 6, 4, 7, 9, 5, 8, 6, 10, 4, 7, 5, 8, 6];

function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function VoicePlayer({ url, isMine }: { url: string; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const fixingDurationRef = useRef(false);

  const handleLoadedMetadata = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!Number.isFinite(el.duration)) {
      fixingDurationRef.current = true;
      const onFixTimeUpdate = () => {
        el.removeEventListener("timeupdate", onFixTimeUpdate);
        setDuration(Number.isFinite(el.duration) ? el.duration : 0);
        el.currentTime = 0;
        fixingDurationRef.current = false;
      };
      el.addEventListener("timeupdate", onFixTimeUpdate);
      el.currentTime = 1e101;
    } else {
      setDuration(el.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (fixingDurationRef.current) return;
    setCurrentTime(audioRef.current?.currentTime ?? 0);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * duration;
    setCurrentTime(el.currentTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = (playing || currentTime > 0) ? fmtTime(currentTime) : fmtTime(duration);

  return (
    <div className="flex items-center gap-2.5 py-0.5" style={{ minWidth: 176, maxWidth: 224 }}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Play / Pause */}
      <button
        type="button"
        onClick={toggle}
        className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
          isMine
            ? "bg-cyan-400/25 hover:bg-cyan-400/40 text-cyan-100"
            : "bg-white/20 hover:bg-white/30 text-white"
        }`}
      >
        {playing
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5 ml-0.5" />
        }
      </button>

      {/* Waveform + progress bar + time */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {/* Clickable waveform bars with progress overlay */}
        <div
          className="flex items-end gap-[1.5px] h-6 cursor-pointer relative"
          onClick={seek}
        >
          {/* Progress bar background */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-400/40 to-cyan-300/30 transition-all"
            style={{ width: `${progress}%` }}
          />
          {/* Waveform bars */}
          {WAVEFORM.map((h, i) => {
            const active = (i / WAVEFORM.length) * 100 <= progress;
            return (
              <div
                key={i}
                style={{ height: `${h * 9}%` }}
                className={`flex-1 rounded-full transition-colors relative z-10 ${
                  active
                    ? isMine ? "bg-cyan-300" : "bg-white/85"
                    : isMine ? "bg-cyan-300/30" : "bg-white/25"
                }`}
              />
            );
          })}
        </div>
        {/* Timestamp */}
        <span className={`text-[9px] tabular-nums leading-none ${isMine ? "text-cyan-200/70" : "text-zinc-400"}`}>
          {displayTime}
        </span>
      </div>
    </div>
  );
}

// ─── Eye / read status ────────────────────────────────────────────────────────
function EyeStatus({ msg, viewerRole }: { msg: SupportMessage; viewerRole: "user" | "admin" }) {
  const seenAt = viewerRole === "admin" ? msg.read_by_user_at : msg.read_by_admin_at;
  if (seenAt) {
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0">
        <Eye className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]" />
        <Eye className="h-3 w-3 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]" />
      </span>
    );
  }
  if (msg.delivered_at) {
    return (
      <span className="inline-flex items-center gap-0.5 shrink-0">
        <Eye className="h-3 w-3 text-zinc-500" />
        <Eye className="h-3 w-3 text-zinc-500" />
      </span>
    );
  }
  return <Eye className="h-3 w-3 text-zinc-600 shrink-0" />;
}

// ─── Message bubble ───────────────────────────────────────────────────────────
export function MessageBubble({
  msg,
  isMine,
  viewerRole,
  onContextMenu,
  onReplyPreview,
  onToolCard,
  isSending,
  sendError,
}: MessageBubbleProps) {
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
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
        <div className="rounded-2xl px-3.5 py-2 bg-white/5 border border-white/10 italic text-zinc-500 text-xs">
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${isMine ? "justify-end" : "justify-start"} gap-1 mb-2 group w-full`}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, msg); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={cancelLongPress}
      onTouchMove={cancelLongPress}
    >
      {/* Received message: options button on left */}
      {!isMine && (
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e, msg); }}
          className="shrink-0 h-6 w-6 mt-1 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10"
          title="Message options"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[80%] sm:max-w-md rounded-2xl px-3.5 py-2.5 text-sm shadow-lg relative ${
          isMine
            ? "bg-gradient-to-br from-cyan-600/30 to-cyan-500/20 text-cyan-50 rounded-br-sm border border-cyan-500/20"
            : "bg-white/10 text-zinc-100 rounded-bl-sm border border-white/10"
        }`}
      >
        {/* Reply preview */}
        {onReplyPreview}

        {/* Image */}
        {msg.image_url && (
          <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
            <img
              src={msg.image_url}
              alt="attachment"
              className="rounded-xl max-h-48 w-full object-cover border border-white/10 hover:opacity-90 transition-opacity"
            />
          </a>
        )}

        {/* Voice note */}
        {msg.audio_url && (
          <div className="mb-1">
            <VoicePlayer url={msg.audio_url} isMine={isMine} />
          </div>
        )}

        {/* Tool card */}
        {onToolCard}

        {/* Body text */}
        {msg.body && (
          <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">{msg.body}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-1.5 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 flex-shrink">{formatDate(msg.created_at)}</span>
            {msg.edited_at && <span className="text-[10px] text-zinc-500 italic">edited</span>}
            {isSending && <span className="text-[8px] text-zinc-500 animate-pulse">sending…</span>}
            {sendError && <span className="text-[8px] text-red-400">✗</span>}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {isMine && <EyeStatus msg={msg} viewerRole={viewerRole} />}
            {isMine && (
              <button
                onClick={(e) => { e.stopPropagation(); onContextMenu(e, msg); }}
                className={`shrink-0 h-5 w-5 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 ${
                  isSending || sendError ? "opacity-50 cursor-not-allowed" : "opacity-100"
                }`}
                title={isSending ? "Sending…" : "Message options"}
              >
                <MoreVertical className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
