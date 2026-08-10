/**
 * Dashboard-owned database types.
 *
 * The coordinator asked me NOT to touch packages/shared/src/database.types.ts
 * (another workstream regenerates it), so this is a separate, hand-written file
 * scoped to the tables the dashboard reads or writes. It is intentionally
 * partial — it does not model the whole storefront schema, only what Stage 1
 * touches, plus the tables added in migrations 0031-0033.
 *
 * Verified against information_schema on 2026-08-09.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "customer" | "partner" | "admin";
          partner_id: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      partners: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          status: "pending" | "active" | "suspended";
          country: string;
          city: string | null;
          phone: string | null;
          email: string | null;
          commission_rate: number;
          confirmation_timeout_minutes: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["partners"]["Row"]> & { name: string; slug: string };
        Update: Partial<Database["public"]["Tables"]["partners"]["Row"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          partner_id: string;
          category_id: string;
          title: string;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          currency: string;
          sku: string | null;
          stock_quantity: number;
          is_active: boolean;
          is_featured: boolean;
          is_trending: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price_delta: number;
          stock_quantity: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["product_variants"]["Row"]> & {
          product_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_variants"]["Row"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_id: string;
          subtotal: number;
          delivery_fee: number;
          total: number;
          payment_method: string;
          payment_status: string;
          is_gift: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      sub_orders: {
        Row: {
          id: string;
          order_id: string;
          partner_id: string;
          status:
            | "pending"
            | "accepted"
            | "preparing"
            | "ready"
            | "out_for_delivery"
            | "delivered"
            | "cancelled";
          delivery_date: string | null;
          delivery_time_slot: string | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          partner_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["sub_orders"]["Row"],
            "status" | "delivery_date" | "delivery_time_slot" | "partner_notes"
          >
        >;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          sub_order_id: string;
          product_id: string | null;
          product_title_snapshot: string;
          unit_price_snapshot: number;
          quantity: number;
          customization: Json;
          line_total: number;
          variant_id: string | null;
          variant_name_snapshot: string | null;
          commission_rate_snapshot: number | null;
          commission_amount_snapshot: number | null;
          confirmation_status: "pending" | "confirmed" | "rejected" | "substituted";
          confirmed_at: string | null;
          rejection_reason: string | null;
        };
        Insert: never;
        Update: Partial<
          Pick<
            Database["public"]["Tables"]["order_items"]["Row"],
            "confirmation_status" | "confirmed_at" | "rejection_reason"
          >
        >;
        Relationships: [];
      };
      store_payables: {
        Row: {
          id: string;
          store_id: string;
          order_id: string | null;
          gross_amount: number;
          commission_rate: number;
          commission_amount: number;
          net_owed: number;
          status: "pending" | "paid";
          paid_at: string | null;
          payout_period_id: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      payout_periods: {
        Row: {
          id: string;
          partner_id: string;
          period_start: string;
          period_end: string;
          status: "open" | "closed" | "paid" | "void";
          gross_total: number;
          commission_total: number;
          net_total: number;
          reference: string | null;
          note: string | null;
          closed_at: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["payout_periods"]["Row"]> & {
          partner_id: string;
          period_start: string;
          period_end: string;
        };
        Update: Partial<Database["public"]["Tables"]["payout_periods"]["Row"]>;
        Relationships: [];
      };
      store_metrics: {
        Row: {
          partner_id: string;
          day: string;
          orders_count: number;
          items_count: number;
          units_count: number;
          gross_revenue: number;
          commission_amount: number;
          net_revenue: number;
          cancelled_count: number;
          delivered_count: number;
          avg_confirm_seconds: number | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      order_events: {
        Row: {
          id: string;
          order_id: string | null;
          sub_order_id: string | null;
          order_item_id: string | null;
          partner_id: string | null;
          event_type: string;
          actor_id: string | null;
          actor_role: "system" | "customer" | "partner" | "admin";
          from_status: string | null;
          to_status: string | null;
          message: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string | null;
          partner_id: string | null;
          sub_order_id: string | null;
          channel: "email" | "sms" | "whatsapp" | "push" | "in_app";
          template: string;
          destination: string | null;
          subject: string | null;
          body: string | null;
          status: "queued" | "sent" | "failed" | "skipped";
          error: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      store_owner_invites: {
        Row: {
          id: string;
          email: string;
          partner_id: string;
          invited_by: string | null;
          auth_user_id: string | null;
          status: "pending" | "accepted" | "revoked";
          note: string | null;
          created_at: string;
          accepted_at: string | null;
          revoked_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["store_owner_invites"]["Row"]> & {
          email: string;
          partner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["store_owner_invites"]["Row"]>;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_store_owner: { Args: Record<string, never>; Returns: boolean };
      my_partner_id: { Args: Record<string, never>; Returns: string | null };
      partner_order_context: {
        Args: { p_sub_order_id: string };
        Returns: {
          order_number: string;
          placed_at: string;
          payment_method: string;
          payment_status: string;
          is_gift: boolean;
          hide_price: boolean;
          gift_message: string | null;
          delivery_slot: string | null;
          recipient_name: string | null;
          recipient_phone: string | null;
          address_city: string | null;
          address_area: string | null;
          address_street: string | null;
          address_building: string | null;
          address_floor: string | null;
          address_apartment: string | null;
          address_notes: string | null;
        }[];
      };
      rebuild_store_metrics: {
        Args: { p_partner_id: string; p_from?: string; p_to?: string };
        Returns: number;
      };
    };
  };
}
