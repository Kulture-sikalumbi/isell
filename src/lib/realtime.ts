import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type ChangeHandler = () => void;
type WalletListener = (row: { balance: number; currency: string }) => void;

interface MulticastChannel {
  listeners: Set<ChangeHandler>;
  channel: RealtimeChannel;
  supabase: SupabaseClient;
}

interface WalletChannel {
  listeners: Set<WalletListener>;
  channel: RealtimeChannel;
  supabase: SupabaseClient;
}

const tableChannels = new Map<string, MulticastChannel>();
const walletChannels = new Map<string, WalletChannel>();

function notifyWalletListeners(
  listeners: Set<WalletListener>,
  row: { balance: number; currency: string }
) {
  listeners.forEach((fn) => fn(row));
}

/** Multicast postgres_changes on multiple tables — one channel per channelName. */
export function subscribeToTables(
  channelName: string,
  tables: string[],
  onChange: ChangeHandler
): (() => void) | undefined {
  const supabase = createClient();
  if (!supabase) return undefined;

  let entry = tableChannels.get(channelName);

  if (!entry) {
    const listeners = new Set<ChangeHandler>();
    let channel = supabase.channel(channelName);

    for (const table of tables) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          listeners.forEach((fn) => fn());
        }
      );
    }

    channel.subscribe();
    entry = { listeners, channel, supabase };
    tableChannels.set(channelName, entry);
  }

  entry.listeners.add(onChange);

  return () => {
    const current = tableChannels.get(channelName);
    if (!current) return;

    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.supabase.removeChannel(current.channel);
      tableChannels.delete(channelName);
    }
  };
}

/** Multicast wallet balance updates — one channel per userId. */
export function subscribeToWallet(
  userId: string,
  onChange: WalletListener
): (() => void) | undefined {
  const supabase = createClient();
  if (!supabase) return undefined;

  let entry = walletChannels.get(userId);

  if (!entry) {
    const listeners = new Set<WalletListener>();

    const channel = supabase
      .channel(`wallet:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_wallets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { balance: number; currency: string };
          notifyWalletListeners(listeners, {
            balance: Number(row.balance),
            currency: row.currency,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_wallets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { balance: number; currency: string };
          notifyWalletListeners(listeners, {
            balance: Number(row.balance),
            currency: row.currency,
          });
        }
      )
      .subscribe();

    entry = { listeners, channel, supabase };
    walletChannels.set(userId, entry);
  }

  entry.listeners.add(onChange);

  return () => {
    const current = walletChannels.get(userId);
    if (!current) return;

    current.listeners.delete(onChange);
    if (current.listeners.size === 0) {
      current.supabase.removeChannel(current.channel);
      walletChannels.delete(userId);
    }
  };
}

const activationChannels = new Map<string, MulticastChannel>();

export function subscribeToActivation(
  paymentId: string,
  onActivation: () => void
): (() => void) | undefined {
  const supabase = createClient();
  if (!supabase) return undefined;

  const key = `activation:${paymentId}`;
  let entry = activationChannels.get(key);

  if (!entry) {
    const listeners = new Set<ChangeHandler>();

    const channel = supabase
      .channel(key)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activations",
          filter: `payment_id=eq.${paymentId}`,
        },
        () => {
          listeners.forEach((fn) => fn());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "payments",
          filter: `id=eq.${paymentId}`,
        },
        () => {
          listeners.forEach((fn) => fn());
        }
      )
      .subscribe();

    entry = { listeners, channel, supabase };
    activationChannels.set(key, entry);
  }

  entry.listeners.add(onActivation);

  return () => {
    const current = activationChannels.get(key);
    if (!current) return;

    current.listeners.delete(onActivation);
    if (current.listeners.size === 0) {
      current.supabase.removeChannel(current.channel);
      activationChannels.delete(key);
    }
  };
}
