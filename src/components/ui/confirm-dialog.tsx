"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  disabled?: boolean;
  children: ReactNode;
  labelledBy: string;
}

function ModalShell({ open, onClose, disabled, children, labelledBy }: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] overflow-y-auto overscroll-contain" role="presentation">
      <div className="flex min-h-[100dvh] items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          aria-label="Close dialog"
          onClick={() => !disabled && onClose()}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className="relative z-10 w-full max-w-md panel-solid rounded-2xl border border-white/10 p-5 sm:p-6 shadow-2xl mx-auto"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

type ConfirmVariant = "danger" | "default";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  loading = false,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = "confirm-dialog-title";
  const isDanger = variant === "danger";

  return (
    <ModalShell
      open={open}
      onClose={() => onOpenChange(false)}
      disabled={loading}
      labelledBy={titleId}
    >
      <button
        type="button"
        onClick={() => !loading && onOpenChange(false)}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
        aria-label="Close"
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8 mb-4">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            isDanger
              ? "bg-red-500/15 border-red-500/30"
              : "bg-cyan-500/15 border-cyan-500/30"
          )}
        >
          <AlertTriangle
            className={cn("h-5 w-5", isDanger ? "text-red-300" : "text-cyan-300")}
          />
        </div>
        <div>
          <h2 id={titleId} className="text-base font-semibold text-white">
            {title}
          </h2>
          <div className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{description}</div>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-400 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          size="md"
          variant={isDanger ? "danger" : "primary"}
          className="flex-1"
          loading={loading}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </Button>
        <Button
          type="button"
          size="md"
          variant="ghost"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          {cancelLabel}
        </Button>
      </div>
    </ModalShell>
  );
}

type AlertVariant = "error" | "info";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  variant?: AlertVariant;
  actionLabel?: string;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  message,
  variant = "error",
  actionLabel = "OK",
}: AlertDialogProps) {
  const titleId = "alert-dialog-title";
  const isError = variant === "error";

  return (
    <ModalShell open={open} onClose={() => onOpenChange(false)} labelledBy={titleId}>
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/5"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8 mb-5">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            isError
              ? "bg-red-500/15 border-red-500/30"
              : "bg-cyan-500/15 border-cyan-500/30"
          )}
        >
          {isError ? (
            <AlertCircle className="h-5 w-5 text-red-300" />
          ) : (
            <Info className="h-5 w-5 text-cyan-300" />
          )}
        </div>
        <div>
          <h2 id={titleId} className="text-base font-semibold text-white">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{message}</p>
        </div>
      </div>

      <Button type="button" size="md" className="w-full" onClick={() => onOpenChange(false)}>
        {actionLabel}
      </Button>
    </ModalShell>
  );
}
