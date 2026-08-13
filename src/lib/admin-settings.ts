import { createServiceClient } from "@/lib/supabase/server";

export interface AdminSettings {
  auto_clear_chat_days: number | null;
  auto_clear_images: boolean;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const supabase = createServiceClient();
  if (!supabase) {
    return { auto_clear_chat_days: null, auto_clear_images: true };
  }

  const { data } = await supabase.from("admin_settings").select("key, value");

  const settings = {
    auto_clear_chat_days: null as number | null,
    auto_clear_images: true,
  };

  if (data) {
    for (const row of data) {
      if (row.key === "auto_clear_chat_days" && row.value) {
        settings.auto_clear_chat_days = parseInt(row.value, 10);
      }
      if (row.key === "auto_clear_images" && row.value) {
        settings.auto_clear_images = row.value === "true";
      }
    }
  }

  return settings;
}

export async function updateAdminSetting(key: string, value: string | null): Promise<boolean> {
  const supabase = createServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("admin_settings")
    .update({ value, updated_at: new Date().toISOString() })
    .eq("key", key);

  return !error;
}
