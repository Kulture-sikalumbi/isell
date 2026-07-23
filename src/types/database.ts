import type { CheckoutFieldValue, ToolFormField } from "@/lib/tool-form-fields";

export type UserRole = "user" | "admin";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type ToolFulfillmentMode = "manual" | "direct_api";
export type FulfillmentStatus = "awaiting" | "fulfilled";

export type DisplayCurrency = "ZMW" | "USD";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  display_currency: DisplayCurrency | null;
  welcome_email_sent_at: string | null;
  created_at: string;
}

export interface ToolCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  download_url: string | null;
  download_url_mac: string | null;
  sort_order: number;
  is_featured: boolean;
  featured_sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ActivationTimeUnit = "minutes" | "hours" | "days";

export interface Tool {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  download_url: string | null;
  download_url_mac: string | null;
  category_id: string | null;
  sort_order: number;
  activation_time_value: number | null;
  activation_time_unit: ActivationTimeUnit | null;
  retail_price: number;
  price_currency: DisplayCurrency;
  wholesale_cost: number;
  fulfillment_mode: ToolFulfillmentMode;
  developer_api_url: string | null;
  activation_type_id: string | null;
  external_service_id: string | null;
  external_service_name: string | null;
  identifier_label: string;
  identifier_instructions: string | null;
  identifier_placeholder: string | null;
  /** Admin-defined checkout inputs (label, placeholder, hint, etc.). */
  form_fields: ToolFormField[] | null;
  /** Optional title above help instructions on the device page. */
  form_help_title: string | null;
  developer_name: string | null;
  api_config: Record<string, unknown>;
  platform_fee_percent: number | null;
  is_active: boolean;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ToolWithCategory extends Tool {
  category?: ToolCategory | null;
}

export interface Payment {
  id: string;
  user_id: string | null;
  tool_id: string;
  hardware_id: string;
  /** Full checkout field values when the tool has multiple inputs. */
  checkout_fields: CheckoutFieldValue[] | null;
  amount: number;
  currency: string;
  provider: string | null;
  provider_reference: string | null;
  order_number: string;
  status: PaymentStatus;
  fulfillment_status: FulfillmentStatus | null;
  platform_fee: number;
  refund_note: string | null;
  refunded_at: string | null;
  created_at: string;
  completed_at: string | null;
  tool?: Tool;
}

export type DepositStatus = "pending" | "confirmed" | "rejected";
export type DepositMethod = "mtn" | "airtel" | "binance" | "usdt_trc20" | "other";
export type WalletTxType =
  | "deposit"
  | "purchase"
  | "platform_fee"
  | "refund"
  | "adjustment"
  | "withdrawal";

export type UserPaymentMethodType = "mtn" | "airtel" | "binance" | "usdt_trc20";
export type WithdrawalStatus = "pending" | "completed" | "rejected";

export interface UserWallet {
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface WalletDeposit {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  /** Credited wallet amount after FX at confirm; null while pending */
  settled_amount: number | null;
  settled_currency: string | null;
  /** USD→ZMW rate locked at confirm when conversion was needed */
  fx_usd_to_zmw: number | null;
  fx_source: string | null;
  fx_locked_at: string | null;
  method: DepositMethod;
  transaction_id: string | null;
  provider: string | null;
  provider_reference: string | null;
  provider_status: string | null;
  provider_payload: Record<string, unknown> | null;
  sender_phone: string | null;
  sender_name: string | null;
  reference: string;
  status: DepositStatus;
  admin_note: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: WalletTxType;
  amount: number;
  balance_after: number;
  currency: string;
  source_amount: number | null;
  source_currency: string | null;
  fx_usd_to_zmw: number | null;
  description: string | null;
  deposit_id: string | null;
  payment_id: string | null;
  withdrawal_id: string | null;
  created_at: string;
}

export interface UserPaymentMethod {
  id: string;
  user_id: string;
  method: UserPaymentMethodType;
  label: string | null;
  account_identifier: string;
  account_name: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method_id: string;
  payment_method_snapshot: {
    method: UserPaymentMethodType;
    label?: string | null;
    account_identifier: string;
    account_name?: string | null;
  };
  reference: string;
  status: WithdrawalStatus;
  policy_accepted_at: string;
  admin_note: string | null;
  processed_at: string | null;
  created_at: string;
}

export interface Activation {
  id: string;
  user_id: string | null;
  payment_id: string;
  tool_id: string;
  hardware_id: string;
  activation_code: string;
  created_at: string;
  tool?: Tool;
}

export interface DeveloperApiLog {
  id: string;
  payment_id: string | null;
  direction: "outbound" | "inbound";
  endpoint: string | null;
  payload: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  status_code: number | null;
  created_at: string;
}

export interface ResellerCredit {
  id: string;
  developer_name: string;
  balance: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface ToolRequest {
  id: string;
  user_id: string | null;
  user_email: string | null;
  requested_name: string;
  notes: string | null;
  status: "pending" | "fulfilled" | "dismissed";
  created_at: string;
}

export interface SupportMessage {
  id: string;
  user_id: string;
  sender_role: "user" | "admin";
  body: string;
  read_by_user_at: string | null;
  read_by_admin_at: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: string;
  entry_type: "payment_in" | "payout" | "adjustment";
  amount: number;
  currency: string;
  description: string | null;
  payment_id: string | null;
  deposit_id: string | null;
  created_at: string;
}

export interface CustomerProfile extends Profile {
  orders_count: number;
  total_spent: number;
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  payment_id: string | null;
  read_at: string | null;
  created_at: string;
  payment?: Payment;
}

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Pick<Profile, "id" | "email"> & Partial<Profile>,
        Partial<Profile>
      >;
      tools: TableDef<
        Tool,
        Omit<Tool, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Tool>
      >;
      payments: TableDef<
        Payment,
        Omit<Payment, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<Payment>
      >;
      activations: TableDef<
        Activation,
        Omit<Activation, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<Activation>
      >;
      developer_api_logs: TableDef<
        DeveloperApiLog,
        Omit<DeveloperApiLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<DeveloperApiLog>
      >;
      reseller_credits: TableDef<
        ResellerCredit,
        Omit<ResellerCredit, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<ResellerCredit>
      >;
      admin_notifications: TableDef<
        AdminNotification,
        Omit<AdminNotification, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<AdminNotification>
      >;
      tool_requests: TableDef<
        ToolRequest,
        Omit<ToolRequest, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<ToolRequest>
      >;
      support_messages: TableDef<
        SupportMessage,
        Omit<SupportMessage, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<SupportMessage>
      >;
      ledger_entries: TableDef<
        LedgerEntry,
        Omit<LedgerEntry, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        },
        Partial<LedgerEntry>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
