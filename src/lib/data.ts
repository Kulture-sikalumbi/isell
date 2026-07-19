import { createServiceClient } from "@/lib/supabase/server";
import { paymentNeedsFulfillment, type AdminPaymentRow } from "@/lib/payment-fulfillment";
import { toStorefrontTools } from "@/lib/storefront-tool";
import type { StorefrontTool } from "@/lib/storefront-tool";
import type {
  Activation,
  AdminNotification,
  CustomerProfile,
  Payment,
  Profile,
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

export async function getCustomersWithStats(): Promise<CustomerProfile[]> {
  const supabase = getClient();
  if (!supabase) return [];

  const [profilesRes, paymentsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("payments").select("user_id, amount, status").eq("status", "completed"),
  ]);

  const profiles = profilesRes.data ?? [];
  const payments = paymentsRes.data ?? [];

  const stats = new Map<string, { count: number; spent: number }>();
  for (const p of payments) {
    if (!p.user_id) continue;
    const cur = stats.get(p.user_id) ?? { count: 0, spent: 0 };
    cur.count += 1;
    cur.spent += Number(p.amount);
    stats.set(p.user_id, cur);
  }

  return profiles
    .filter((p) => p.role === "user")
    .map((p) => ({
      ...p,
      orders_count: stats.get(p.id)?.count ?? 0,
      total_spent: stats.get(p.id)?.spent ?? 0,
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
