import { notFound } from "next/navigation";
import { ReceiptPageClient } from "@/components/dashboard/receipt-page-client";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { buildOrderReceiptData } from "@/lib/order-receipt";
import type { Payment } from "@/types/database";

interface ReceiptPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ print?: string }>;
}

export default async function OrderReceiptPage({ params, searchParams }: ReceiptPageProps) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const { id } = await params;
  const { print } = await searchParams;

  const supabase = createServiceClient();
  if (!supabase) notFound();

  const { data: payment } = await supabase
    .from("payments")
    .select("*, tool:tools(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!payment || payment.status !== "completed") {
    notFound();
  }

  const { data: activation } = await supabase
    .from("activations")
    .select("*")
    .eq("payment_id", id)
    .maybeSingle();

  const customerName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Customer";

  const receiptData = buildOrderReceiptData({
    payment: payment as Payment,
    customerName,
    customerEmail: user.email ?? "",
    activation,
  });

  return (
    <ReceiptPageClient data={receiptData} autoPrint={print === "1"} />
  );
}
