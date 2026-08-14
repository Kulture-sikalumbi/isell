"use client";

import { useState } from "react";
import { Check, Copy, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActivationDetailsModal } from "@/components/dashboard/activation-details-modal";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { parseToolApiConfig } from "@/lib/tool-api-config";
import { formatDate } from "@/lib/utils";
import type { Activation, Payment } from "@/types/database";

interface ActivationCardProps {
  activation: Activation;
  payment?: Payment;
}

export function ActivationCard({ activation, payment }: ActivationCardProps) {
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<Payment | null>(payment || null);

  const config = parseToolApiConfig(activation.tool?.api_config);
  const isWhitelist =
    activation.activation_code === "DEVICE_REGISTERED" ||
    config.delivery_type === "whitelist";

  const handleViewDetails = async () => {
    // If payment is already provided, just open modal
    if (paymentData) {
      setModalOpen(true);
      return;
    }

    // Otherwise fetch payment details
    setLoadingPayment(true);
    try {
      const response = await fetch(
        `/api/payments/${activation.payment_id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPaymentData(data.payment);
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch payment details:", error);
    } finally {
      setLoadingPayment(false);
    }
  };

  function copyCode() {
    navigator.clipboard.writeText(activation.activation_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div className="glass rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">
              {activation.tool?.name ?? "Unknown Tool"}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {getCustomerIdentifierLabel(activation.tool?.identifier_label)}: {activation.hardware_id}
            </p>
          </div>
          <Badge variant="success">Completed</Badge>
        </div>

      {isWhitelist ? (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-4 text-sm text-emerald-200">
          {config.success_message}
        </div>
      ) : (
        <div className="relative group">
          <div className="code-block rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-lg font-bold text-gradient tracking-wider">
            {activation.activation_code}
          </div>
          <button
            onClick={copyCode}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-3">
        Activated {formatDate(activation.created_at)}
      </p>

      <Button
        onClick={handleViewDetails}
        disabled={loadingPayment}
        variant="secondary"
        size="sm"
        className="w-full mt-4 gap-2"
      >
        {loadingPayment ? "Loading..." : "View Details"}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>

    {paymentData && (
      <ActivationDetailsModal
        activation={activation}
        payment={paymentData}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    )}
  </>
  );
}
