import { formatSiteCurrency, getCurrencyLabel, resolveDisplayCurrency } from "@/lib/currency";
import { formatOrderNumber } from "@/lib/order-number";
import { getCustomerIdentifierLabel } from "@/lib/identifier-label";
import { formatDate } from "@/lib/utils";
import type { Activation, Payment } from "@/types/database";

export interface OrderReceiptData {
  receiptNumber: string;
  paymentId: string;
  issuedAt: string;
  paidAt: string | null;
  customerName: string;
  customerEmail: string;
  toolName: string;
  identifierLabel: string;
  hardwareId: string;
  subtotal: number;
  platformFee: number;
  total: number;
  currency: string;
  currencyLabel: string;
  paymentMethod: string;
  statusLabel: string;
  fulfillmentLabel: string;
  activationCode: string | null;
}

export function buildOrderReceiptData(input: {
  payment: Payment;
  customerName: string;
  customerEmail: string;
  activation?: Activation | null;
}): OrderReceiptData {
  const { payment, customerName, customerEmail, activation } = input;
  const currency = resolveDisplayCurrency(payment.currency);
  const subtotal = Number(payment.amount);
  const platformFee = Number(payment.platform_fee ?? 0);
  const isWallet = payment.provider === "wallet";
  const total = isWallet ? subtotal + platformFee : subtotal;

  let statusLabel = "Paid";
  if (payment.status === "pending") statusLabel = "Pending";
  else if (payment.status === "failed") statusLabel = "Failed";
  else if (payment.status === "refunded") statusLabel = "Refunded";

  let fulfillmentLabel = "—";
  if (payment.fulfillment_status === "awaiting") fulfillmentLabel = "Processing activation";
  else if (payment.fulfillment_status === "fulfilled") fulfillmentLabel = "Activation delivered";

  return {
    receiptNumber: formatOrderNumber(payment),
    paymentId: payment.id,
    issuedAt: formatDate(payment.created_at),
    paidAt: payment.completed_at ? formatDate(payment.completed_at) : null,
    customerName,
    customerEmail,
    toolName: payment.tool?.name ?? "Tool activation",
    identifierLabel: getCustomerIdentifierLabel(payment.tool?.identifier_label),
    hardwareId: payment.hardware_id,
    subtotal,
    platformFee,
    total,
    currency,
    currencyLabel: getCurrencyLabel(currency),
    paymentMethod: isWallet ? "Wallet balance" : payment.provider ?? "Online payment",
    statusLabel,
    fulfillmentLabel,
    activationCode:
      activation?.activation_code && activation.activation_code !== "DEVICE_REGISTERED"
        ? activation.activation_code
        : null,
  };
}
