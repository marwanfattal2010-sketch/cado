export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          area: string
          building: string | null
          city: string
          country: string
          created_at: string
          floor: string | null
          id: string
          is_default: boolean
          label: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          phone: string
          profile_id: string
          recipient_name: string
          street: string
        }
        Insert: {
          apartment?: string | null
          area: string
          building?: string | null
          city: string
          country?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone: string
          profile_id: string
          recipient_name: string
          street: string
        }
        Update: {
          apartment?: string | null
          area?: string
          building?: string | null
          city?: string
          country?: string
          created_at?: string
          floor?: string | null
          id?: string
          is_default?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          phone?: string
          profile_id?: string
          recipient_name?: string
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          customization: Json
          id: string
          product_id: string
          profile_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          customization?: Json
          id?: string
          product_id: string
          profile_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          customization?: Json
          id?: string
          product_id?: string
          profile_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          code: string
          created_at: string
          currency: string
          current_balance: number
          delivery_method: string
          expires_at: string | null
          failed_pin_attempts: number
          id: string
          locked_until: string | null
          message: string | null
          original_amount: number
          pin_hash: string
          recipient_email: string | null
          recipient_name: string
          status: string
        }
        Insert: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          code: string
          created_at?: string
          currency?: string
          current_balance: number
          delivery_method?: string
          expires_at?: string | null
          failed_pin_attempts?: number
          id?: string
          locked_until?: string | null
          message?: string | null
          original_amount: number
          pin_hash: string
          recipient_email?: string | null
          recipient_name: string
          status?: string
        }
        Update: {
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          code?: string
          created_at?: string
          currency?: string
          current_balance?: number
          delivery_method?: string
          expires_at?: string | null
          failed_pin_attempts?: number
          id?: string
          locked_until?: string | null
          message?: string | null
          original_amount?: number
          pin_hash?: string
          recipient_email?: string | null
          recipient_name?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount_used: number
          balance_after: number
          created_at: string
          gift_card_id: string
          id: string
          order_id: string | null
          store_id: string | null
        }
        Insert: {
          amount_used: number
          balance_after: number
          created_at?: string
          gift_card_id: string
          id?: string
          order_id?: string | null
          store_id?: string | null
        }
        Update: {
          amount_used?: number
          balance_after?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          order_id?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payables: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          gross_amount: number
          id: string
          net_owed: number
          order_id: string | null
          paid_at: string | null
          status: string
          store_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          gross_amount: number
          id?: string
          net_owed: number
          order_id?: string | null
          paid_at?: string | null
          status?: string
          store_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_owed?: number
          order_id?: string | null
          paid_at?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_payables_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payables_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      occasion_events: {
        Row: {
          banner_image_url: string | null
          event_date: string
          id: string
          is_active: boolean
          occasion_id: string | null
          title: string
        }
        Insert: {
          banner_image_url?: string | null
          event_date: string
          id?: string
          is_active?: boolean
          occasion_id?: string | null
          title: string
        }
        Update: {
          banner_image_url?: string | null
          event_date?: string
          id?: string
          is_active?: boolean
          occasion_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "occasion_events_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
        ]
      }
      occasion_reminders: {
        Row: {
          created_at: string
          event_date: string
          id: string
          label: string | null
          last_reminded_on: string | null
          note: string | null
          occasion_type: string
          person_name: string
          phone: string | null
          profile_id: string
          relationship: string | null
          remind_days_before: number
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          label?: string | null
          last_reminded_on?: string | null
          note?: string | null
          occasion_type?: string
          person_name: string
          phone?: string | null
          profile_id: string
          relationship?: string | null
          remind_days_before?: number
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          label?: string | null
          last_reminded_on?: string | null
          note?: string | null
          occasion_type?: string
          person_name?: string
          phone?: string | null
          profile_id?: string
          relationship?: string | null
          remind_days_before?: number
        }
        Relationships: [
          {
            foreignKeyName: "occasion_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      occasions: {
        Row: {
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: {
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          customization: Json
          id: string
          line_total: number
          product_id: string | null
          product_title_snapshot: string
          quantity: number
          sub_order_id: string
          unit_price_snapshot: number
        }
        Insert: {
          customization?: Json
          id?: string
          line_total: number
          product_id?: string | null
          product_title_snapshot: string
          quantity: number
          sub_order_id: string
          unit_price_snapshot: number
        }
        Update: {
          customization?: Json
          id?: string
          line_total?: number
          product_id?: string | null
          product_title_snapshot?: string
          quantity?: number
          sub_order_id?: string
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: string
          sub_order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: string
          sub_order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          sub_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_source: string
          created_at: string
          customer_id: string
          delivery_address_id: string | null
          delivery_fee: number
          delivery_slot: string | null
          discount_amount: number
          gift_card_code: string | null
          gift_message: string | null
          hide_price: boolean
          id: string
          is_gift: boolean
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          recipient_name: string | null
          recipient_phone: string | null
          subtotal: number
          total: number
        }
        Insert: {
          address_source?: string
          created_at?: string
          customer_id: string
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_slot?: string | null
          discount_amount?: number
          gift_card_code?: string | null
          gift_message?: string | null
          hide_price?: boolean
          id?: string
          is_gift?: boolean
          notes?: string | null
          order_number: string
          payment_method?: string
          payment_status?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          subtotal: number
          total: number
        }
        Update: {
          address_source?: string
          created_at?: string
          customer_id?: string
          delivery_address_id?: string | null
          delivery_fee?: number
          delivery_slot?: string | null
          discount_amount?: number
          gift_card_code?: string | null
          gift_message?: string | null
          hide_price?: boolean
          id?: string
          is_gift?: boolean
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_address_id_fkey"
            columns: ["delivery_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gift_card_code_fkey"
            columns: ["gift_card_code"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["code"]
          },
        ]
      }
      partners: {
        Row: {
          city: string | null
          commission_rate: number
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_live: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: string
        }
        Insert: {
          city?: string | null
          commission_rate?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_live?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: string
        }
        Update: {
          city?: string | null
          commission_rate?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_live?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          id: string
          is_primary: boolean
          partner_id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          partner_id: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          partner_id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          avg_rating: number | null
          category_id: string
          compare_at_price: number | null
          country: string
          created_at: string
          currency: string
          description: string | null
          gift_wrap_available: boolean
          gift_wrap_price: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_trending: boolean
          occasion_tags: string[]
          partner_id: string
          price: number
          recipient_tags: string[]
          same_day: boolean
          tags: string[]
          sku: string | null
          slug: string
          stock_quantity: number
          subcategory_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          avg_rating?: number | null
          category_id: string
          compare_at_price?: number | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          gift_wrap_available?: boolean
          gift_wrap_price?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_trending?: boolean
          occasion_tags?: string[]
          partner_id: string
          price: number
          recipient_tags?: string[]
          same_day?: boolean
          tags?: string[]
          sku?: string | null
          slug: string
          stock_quantity?: number
          subcategory_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          avg_rating?: number | null
          category_id?: string
          compare_at_price?: number | null
          country?: string
          created_at?: string
          currency?: string
          description?: string | null
          gift_wrap_available?: boolean
          gift_wrap_price?: number
          id?: string
          is_active?: boolean
          is_featured?: boolean
          is_trending?: boolean
          occasion_tags?: string[]
          partner_id?: string
          price?: number
          recipient_tags?: string[]
          same_day?: boolean
          tags?: string[]
          sku?: string | null
          slug?: string
          stock_quantity?: number
          subcategory_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          partner_id: string | null
          phone: string | null
          push_token: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          partner_id?: string | null
          phone?: string | null
          push_token?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          partner_id?: string | null
          phone?: string | null
          push_token?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_orders: {
        Row: {
          created_at: string
          delivery_date: string | null
          delivery_fee: number
          delivery_time_slot: string | null
          id: string
          order_id: string
          partner_id: string
          partner_notes: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_time_slot?: string | null
          id?: string
          order_id: string
          partner_id: string
          partner_notes?: string | null
          status?: string
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          delivery_fee?: number
          delivery_time_slot?: string | null
          id?: string
          order_id?: string
          partner_id?: string
          partner_notes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_orders_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          created_at: string
          id: string
          notify_days_before: number
          occasion_id: string | null
          profile_id: string
          recipient_name: string
          relationship: string | null
          reminder_date: string
          repeat_yearly: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          notify_days_before?: number
          occasion_id?: string | null
          profile_id: string
          recipient_name: string
          relationship?: string | null
          reminder_date: string
          repeat_yearly?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          notify_days_before?: number
          occasion_id?: string | null
          profile_id?: string
          recipient_name?: string
          relationship?: string | null
          reminder_date?: string
          repeat_yearly?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_reminders_occasion_id_fkey"
            columns: ["occasion_id"]
            isOneToOne: false
            referencedRelation: "occasions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_gift_card_balance: {
        Args: { p_code: string }
        Returns: {
          currency: string
          remaining_balance: number
          from_name: string | null
          card_message: string | null
        }[]
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_per_minute?: number }
        Returns: undefined
      }
      current_client_ip: { Args: never; Returns: string }
      generate_gift_card_code: { Args: never; Returns: string }
      generate_gift_card_pin: { Args: never; Returns: string }
      confirm_gift_card_payment: { Args: { p_gift_card_id: string }; Returns: undefined }
      cancel_unpaid_gift_card: { Args: { p_gift_card_id: string }; Returns: undefined }
      refund_gift_card: { Args: { p_gift_card_id: string }; Returns: undefined }
      reconcile_gift_cards: {
        Args: never
        Returns: {
          gift_card_id: string
          code: string
          expected_spent: number
          actual_spent: number
          discrepancy: number
        }[]
      }
      admin_money_summary: {
        Args: never
        Returns: {
          gift_cards_outstanding_liability: number
          gift_cards_pending_payment_total: number
          gift_cards_active_count: number
          store_id: string
          store_name: string
          store_gross_total: number
          store_commission_total: number
          store_net_owed_total: number
          store_net_paid_total: number
          store_net_unpaid_total: number
        }[]
      }
      get_gift_recommendations: {
        Args: {
          p_budget_max: number
          p_budget_min: number
          p_occasion: string
          p_recipient: string
        }
        Returns: {
          avg_rating: number | null
          category_id: string
          compare_at_price: number | null
          country: string
          created_at: string
          currency: string
          description: string | null
          gift_wrap_available: boolean
          gift_wrap_price: number
          id: string
          is_active: boolean
          is_featured: boolean
          is_trending: boolean
          occasion_tags: string[]
          partner_id: string
          price: number
          recipient_tags: string[]
          same_day: boolean
          tags: string[]
          sku: string | null
          slug: string
          stock_quantity: number
          subcategory_id: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_admin: { Args: never; Returns: boolean }
      my_partner_id: { Args: never; Returns: string }
      place_order: {
        Args: {
          p_address_source?: string
          p_delivery_address_id?: string | null
          p_delivery_date?: string | null
          p_delivery_time_slot?: string | null
          p_gift_card_code?: string | null
          p_gift_message?: string | null
          p_hide_price?: boolean
          p_is_gift?: boolean
          p_notes?: string | null
          p_payment_method?: string
          p_recipient_name?: string | null
          p_recipient_phone?: string | null
        }
        Returns: string
      }
      purchase_gift_card: {
        Args: {
          p_amount: number
          p_buyer_email?: string
          p_buyer_name?: string
          p_delivery_method?: string
          p_message?: string
          p_recipient_email?: string
          p_recipient_name?: string
        }
        Returns: {
          code: string
          id: string
          original_amount: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
