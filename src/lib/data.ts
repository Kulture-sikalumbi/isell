import { createServiceClient } from "@/lib/supabase/server";
import { paymentNeedsFulfillment, type AdminPaymentRow } from "@/lib/payment-fulfillment";
import { toStorefrontTools } from "@/lib/storefront-tool";
import type { StorefrontTool } from "@/lib/storefront-tool";
import type {
  Activation,
  AdminNotification,
  CustomerProfile,
  Payment,

  ResellerCredit,
  Tool,
  ToolCategory,
  ToolRequest,
  ToolWithCategory,
} from "@/types/database";

export interface ToolCategoryWithTools extends ToolCategory {
  tools: StorefrontTool[];
}

function getClient() {
  return createServiceClient();
}

export async function getTools(): Promise<Tool[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("getTools:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getToolBySlug(slug: string): Promise<ToolWithCategory | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tools")
    .select("*, category:tool_categories(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error) return null;
  return data as ToolWithCategory;
}

export async function getAllCategories(): Promise<ToolCategory[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tool_categories")
    .select("*")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("getAllCategories:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getCategoryById(id: string): Promise<ToolCategory | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tool_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getActiveCategoriesWithTools(): Promise<ToolCategoryWithTools[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data: categories, error: catError } = await supabase
    .from("tool_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (catError) {
    console.error("getActiveCategoriesWithTools:", catError.message);
    return [];
  }

  const { data: tools, error: toolError } = await supabase
    .from("tools")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (toolError) {
    console.error("getActiveCategoriesWithTools tools:", toolError.message);
    return [];
  }

  const toolsByCategory = new Map<string, Tool[]>();
  for (const tool of tools ?? []) {
    if (!tool.category_id) continue;
    const list = toolsByCategory.get(tool.category_id) ?? [];
    list.push(tool);
    toolsByCategory.set(tool.category_id, list);
  }

  return (categories ?? []).map((category) => ({
    ...category,
    tools: toStorefrontTools(toolsByCategory.get(category.id) ?? []),
  }));
}

export async function getAllTools(): Promise<ToolWithCategory[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tools")
    .select("*, category:tool_categories(*)")
    .order("sort_order")
    .order("name");

  if (error) {
    console.error("getAllTools:", error.message);
    return [];
  }
  return (data as ToolWithCategory[]) ?? [];
}

export async function getFeaturedCategoriesWithTools(): Promise<ToolCategoryWithTools[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data: categories, error: catError } = await supabase
    .from("tool_categories")
    .select("*")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("featured_sort_order")
    .order("name");

  if (catError) {
    console.error("getFeaturedCategoriesWithTools:", catError.message);
    return [];
  }

  const { data: tools, error: toolError } = await supabase
    .from("tools")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  if (toolError) {
    console.error("getFeaturedCategoriesWithTools tools:", toolError.message);
    return [];
  }

  const toolsByCategory = new Map<string, Tool[]>();
  for (const tool of tools ?? []) {
    if (!tool.category_id) continue;
    const list = toolsByCategory.get(tool.category_id) ?? [];
    list.push(tool);
    toolsByCategory.set(tool.category_id, list);
  }

  return (categories ?? [])
    .filter((c) => c.slug !== "general")
    .map((category) => ({
      ...category,
      tools: toStorefrontTools(toolsByCategory.get(category.id) ?? []),
    }));
}

export async function getToolById(id: string): Promise<Tool | null> {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tools")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getActivations(userId: string): Promise<Activation[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("activations")
    .select("*, tool:tools(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getActivations:", error.message);
    return [];
  }
  return (data as Activation[]) ?? [];
}

export async function getToolRequests(): Promise<ToolRequest[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("tool_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getToolRequests:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getUserPayments(userId: string): Promise<Payment[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("payments")
    .select("*, tool:tools(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserPayments:", error.message);
    return [];
  }
  return (data as Payment[]) ?? [];
}

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*, payment:payments(*, tool:tools(*))")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getAdminNotifications:", error.message);
    return [];
  }
  return (data as AdminNotification[]) ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = getClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}

export async function getPayments(): Promise<Payment[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("payments")
    .select("*, tool:tools(*), activation:activations(id), profile:profiles(email, full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPayments:", error.message);
    return [];
  }
  return (data as Payment[]) ?? [];
}

export async function getResellerCredits(): Promise<ResellerCredit[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("reseller_credits")
    .select("*")
    .order("developer_name");

  if (error) {
    console.error("getResellerCredits:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getCustomersWithStats(displayCurrency?: string): Promise<CustomerProfile[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const [profilesRes, paymentsRes, walletsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("user_id, amount, currency, status").eq("status", "completed"),
    supabase.from("user_wallets").select("user_id, balance, currency"),
  ]);

  const profiles = profilesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const wallets = walletsRes.data ?? [];

  // Get current FX rate for conversions
  const { getUsdToZmwRate } = await import("@/lib/currency-rates");
  const { convertCurrency } = await import("@/lib/format-currency");
  const fxRate = await getUsdToZmwRate();

  const stats = new Map<string, { count: number; spent: number }>();
  for (const p of payments) {
    if (!p.user_id) continue;
    const cur = stats.get(p.user_id) ?? { count: 0, spent: 0 };
    cur.count += 1;
    
    // Convert payment amount to display currency if specified
    const amount = Number(p.amount);
    const convertedAmount = displayCurrency
      ? convertCurrency(amount, p.currency, displayCurrency, fxRate)
      : amount;
    
    cur.spent += convertedAmount;
    stats.set(p.user_id, cur);
  }

  const walletsByUser = new Map<string, { balance: number; currency: string | null }>();
  for (const wallet of wallets) {
    const walletCurrency = wallet.currency ?? null;
    const walletBalance = Number(wallet.balance ?? 0);
    
    // Convert wallet balance to display currency if specified
    const convertedBalance = displayCurrency && walletCurrency
      ? convertCurrency(walletBalance, walletCurrency, displayCurrency, fxRate)
      : walletBalance;
    
    walletsByUser.set(wallet.user_id, {
      balance: convertedBalance,
      currency: displayCurrency ?? walletCurrency,
    });
  }

  return profiles
    .filter((p) => p.role === "user")
    .map((p) => ({
      ...p,
      orders_count: stats.get(p.id)?.count ?? 0,
      total_spent: stats.get(p.id)?.spent ?? 0,
      wallet_balance: walletsByUser.get(p.id)?.balance ?? 0,
      wallet_currency: walletsByUser.get(p.id)?.currency ?? p.display_currency ?? null,
    }));
}

export async function getAllProfiles() {
  const supabase = getClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllProfiles:", error.message);
    return [];
  }
  return data ?? [];
}

export interface CustomerSignupStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
}

/** Counts customer accounts (role = user), including recent signup windows. */
export async function getCustomerSignupStats(): Promise<CustomerSignupStats> {
  const empty: CustomerSignupStats = { total: 0, today: 0, thisWeek: 0, thisMonth: 0 };
  const supabase = getClient();
  if (!supabase) return empty;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const customerFilter = () =>
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user");

  const [totalRes, todayRes, weekRes, monthRes] = await Promise.all([
    customerFilter(),
    customerFilter().gte("created_at", startOfToday.toISOString()),
    customerFilter().gte("created_at", startOfWeek.toISOString()),
    customerFilter().gte("created_at", startOfMonth.toISOString()),
  ]);

  for (const res of [totalRes, todayRes, weekRes, monthRes]) {
    if (res.error) {
      console.error("getCustomerSignupStats:", res.error.message);
    }
  }

  return {
    total: totalRes.count ?? 0,
    today: todayRes.count ?? 0,
    thisWeek: weekRes.count ?? 0,
    thisMonth: monthRes.count ?? 0,
  };
}

export function getAdminStats(payments: Payment[], credits: ResellerCredit[]) {
  const completed = payments.filter((p) => p.status === "completed");
  const revenue = completed.reduce((sum, p) => sum + Number(p.amount), 0);
  const wholesale = completed.reduce(
    (sum, p) => sum + Number(p.tool?.wholesale_cost ?? 0),
    0
  );
  const profit = revenue - wholesale;
  const totalCredit = credits.reduce((sum, c) => sum + Number(c.balance), 0);

  return {
    revenue,
    profit,
    orders: completed.length,
    pending: payments.filter((p) => p.status === "pending").length,
    awaitingFulfillment: payments.filter((p) =>
      paymentNeedsFulfillment(p as AdminPaymentRow)
    ).length,
    totalCredit,
  };
}
