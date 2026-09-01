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
    PostgrestVersion: "14.5"
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
      app_settings: {
        Row: {
          closes_at: string
          id: boolean
          opens_at: string
          timezone: string
          updated_at: string
        }
        Insert: {
          closes_at?: string
          id?: boolean
          opens_at?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          closes_at?: string
          id?: boolean
          opens_at?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
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
      browse_banners: {
        Row: {
          block_id: string
          cta_label: string | null
          ends_at: string | null
          headline: string | null
          id: string
          image_url: string | null
          link_type: string
          link_value: string
          position: number
          starts_at: string | null
          subcopy: string | null
        }
        Insert: {
          block_id: string
          cta_label?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          link_type: string
          link_value: string
          position: number
          starts_at?: string | null
          subcopy?: string | null
        }
        Update: {
          block_id?: string
          cta_label?: string | null
          ends_at?: string | null
          headline?: string | null
          id?: string
          image_url?: string | null
          link_type?: string
          link_value?: string
          position?: number
          starts_at?: string | null
          subcopy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "browse_banners_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "browse_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      browse_blocks: {
        Row: {
          config: Json
          id: string
          is_active: boolean
          position: number
          tab_id: string
          title: string | null
          type: string
        }
        Insert: {
          config?: Json
          id?: string
          is_active?: boolean
          position: number
          tab_id: string
          title?: string | null
          type: string
        }
        Update: {
          config?: Json
          id?: string
          is_active?: boolean
          position?: number
          tab_id?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "browse_blocks_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "browse_tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      browse_tabs: {
        Row: {
          accent_token: string
          filter: Json
          id: string
          is_active: boolean
          label: string
          label_ar: string | null
          position: number
          slug: string
        }
        Insert: {
          accent_token: string
          filter?: Json
          id?: string
          is_active?: boolean
          label: string
          label_ar?: string | null
          position: number
          slug: string
        }
        Update: {
          accent_token?: string
          filter?: Json
          id?: string
          is_active?: boolean
          label?: string
          label_ar?: string | null
          position?: number
          slug?: string
        }
        Relationships: []
      }
      browse_tiles: {
        Row: {
          block_id: string
          group_key: string | null
          id: string
          image_url: string | null
          is_active: boolean
          label: string
          link_type: string
          link_value: string
          position: number
        }
        Insert: {
          block_id: string
          group_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label: string
          link_type: string
          link_value: string
          position: number
        }
        Update: {
          block_id?: string
          group_key?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          label?: string
          link_type?: string
          link_value?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "browse_tiles_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "browse_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          customization: Json
          gift_card_amount_cents: number | null
          id: string
          product_id: string | null
          profile_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          customization?: Json
          gift_card_amount_cents?: number | null
          id?: string
          product_id?: string | null
          profile_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          customization?: Json
          gift_card_amount_cents?: number | null
          id?: string
          product_id?: string | null
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
      dashboard_seed_registry: {
        Row: {
          batch: string
          created_at: string
          id: number
          record_id: string
          table_name: string
        }
        Insert: {
          batch: string
          created_at?: string
          id?: number
          record_id: string
          table_name: string
        }
        Update: {
          batch?: string
          created_at?: string
          id?: number
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          assigned_at: string
          cost: number | null
          delivered_at: string | null
          driver_id: string | null
          id: string
          order_id: string
        }
        Insert: {
          assigned_at?: string
          cost?: number | null
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          order_id: string
        }
        Update: {
          assigned_at?: string
          cost?: number | null
          delivered_at?: string | null
          driver_id?: string | null
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          cost: number | null
          delivered_at: string | null
          driver_id: string
          id: string
          picked_up_at: string | null
          sub_order_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          cost?: number | null
          delivered_at?: string | null
          driver_id: string
          id?: string
          picked_up_at?: string | null
          sub_order_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          cost?: number | null
          delivered_at?: string | null
          driver_id?: string
          id?: string
          picked_up_at?: string | null
          sub_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assignments_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: true
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          phone: string
          profile_id: string | null
          vehicle: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          phone: string
          profile_id?: string | null
          vehicle?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          phone?: string
          profile_id?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      gift_card_pool_contributions: {
        Row: {
          amount_cents: number
          contributor_id: string | null
          contributor_name: string
          created_at: string
          hide_amount: boolean
          id: string
          message: string | null
          payment_ref: string | null
          payment_status: string
          pool_id: string
        }
        Insert: {
          amount_cents: number
          contributor_id?: string | null
          contributor_name: string
          created_at?: string
          hide_amount?: boolean
          id?: string
          message?: string | null
          payment_ref?: string | null
          payment_status?: string
          pool_id: string
        }
        Update: {
          amount_cents?: number
          contributor_id?: string | null
          contributor_name?: string
          created_at?: string
          hide_amount?: boolean
          id?: string
          message?: string | null
          payment_ref?: string | null
          payment_status?: string
          pool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_pool_contributions_contributor_id_fkey"
            columns: ["contributor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_pool_contributions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "gift_card_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_pools: {
        Row: {
          allow_extra: boolean
          created_at: string
          deadline: string | null
          gift_card_id: string | null
          goal_cents: number
          id: string
          note_from: string | null
          note_message: string | null
          note_to: string | null
          occasion: string
          organizer_id: string
          recipient_name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          allow_extra?: boolean
          created_at?: string
          deadline?: string | null
          gift_card_id?: string | null
          goal_cents: number
          id?: string
          note_from?: string | null
          note_message?: string | null
          note_to?: string | null
          occasion: string
          organizer_id: string
          recipient_name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          allow_extra?: boolean
          created_at?: string
          deadline?: string | null
          gift_card_id?: string | null
          goal_cents?: number
          id?: string
          note_from?: string | null
          note_message?: string | null
          note_to?: string | null
          occasion?: string
          organizer_id?: string
          recipient_name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_pools_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_pools_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_rate_limit: {
        Row: {
          created_at: string
          endpoint: string
          id: number
          ip_address: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: number
          ip_address: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: number
          ip_address?: string
          subject?: string | null
        }
        Relationships: []
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
          pin_hash: string | null
          recipient_email: string | null
          recipient_name: string | null
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
          pin_hash?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
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
          pin_hash?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
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
      homepage_config: {
        Row: {
          id: boolean
          store_of_week_partner_id: string | null
          updated_at: string
        }
        Insert: {
          id?: boolean
          store_of_week_partner_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: boolean
          store_of_week_partner_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_config_store_of_week_partner_id_fkey"
            columns: ["store_of_week_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          channel: string
          created_at: string
          destination: string | null
          error: string | null
          id: string
          partner_id: string | null
          recipient_id: string | null
          sent_at: string | null
          status: string
          sub_order_id: string | null
          subject: string | null
          template: string
        }
        Insert: {
          body?: string | null
          channel: string
          created_at?: string
          destination?: string | null
          error?: string | null
          id?: string
          partner_id?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          sub_order_id?: string | null
          subject?: string | null
          template: string
        }
        Update: {
          body?: string | null
          channel?: string
          created_at?: string
          destination?: string | null
          error?: string | null
          id?: string
          partner_id?: string | null
          recipient_id?: string | null
          sent_at?: string | null
          status?: string
          sub_order_id?: string | null
          subject?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
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
      order_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          event_type: string
          from_status: string | null
          id: string
          message: string | null
          order_id: string | null
          order_item_id: string | null
          partner_id: string | null
          payload: Json
          sub_order_id: string | null
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          order_item_id?: string | null
          partner_id?: string | null
          payload?: Json
          sub_order_id?: string | null
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: string
          message?: string | null
          order_id?: string | null
          order_item_id?: string | null
          partner_id?: string | null
          payload?: Json
          sub_order_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_sub_order_id_fkey"
            columns: ["sub_order_id"]
            isOneToOne: false
            referencedRelation: "sub_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_gift_cards: {
        Row: {
          amount_cents: number
          created_at: string
          gift_card_id: string
          id: string
          order_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          gift_card_id: string
          id?: string
          order_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_gift_cards_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: true
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_gift_cards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_amount_snapshot: number | null
          commission_rate_snapshot: number | null
          confirmation_status: string
          confirmed_at: string | null
          customization: Json
          id: string
          line_total: number
          product_id: string | null
          product_title_snapshot: string
          quantity: number
          rejection_reason: string | null
          sub_order_id: string
          unit_price_snapshot: number
          variant_id: string | null
          variant_name_snapshot: string | null
        }
        Insert: {
          commission_amount_snapshot?: number | null
          commission_rate_snapshot?: number | null
          confirmation_status?: string
          confirmed_at?: string | null
          customization?: Json
          id?: string
          line_total: number
          product_id?: string | null
          product_title_snapshot: string
          quantity: number
          rejection_reason?: string | null
          sub_order_id: string
          unit_price_snapshot: number
          variant_id?: string | null
          variant_name_snapshot?: string | null
        }
        Update: {
          commission_amount_snapshot?: number | null
          commission_rate_snapshot?: number | null
          confirmation_status?: string
          confirmed_at?: string | null
          customization?: Json
          id?: string
          line_total?: number
          product_id?: string | null
          product_title_snapshot?: string
          quantity?: number
          rejection_reason?: string | null
          sub_order_id?: string
          unit_price_snapshot?: number
          variant_id?: string | null
          variant_name_snapshot?: string | null
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
          wallet_amount: number | null
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
          wallet_amount?: number | null
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
          wallet_amount?: number | null
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
        ]
      }
      partner_payout_details: {
        Row: {
          account_holder: string | null
          account_number: string | null
          method: string
          partner_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          method?: string
          partner_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          method?: string
          partner_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_details_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: true
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payout_details_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          application_text: string | null
          applied_at: string | null
          city: string | null
          commission_rate: number
          confirmation_timeout_minutes: number
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          driver_contact: string | null
          email: string | null
          featured_rank: number | null
          id: string
          is_demo: boolean
          is_featured: boolean
          is_live: boolean
          logo_url: string | null
          name: string
          offers_gift_wrap: boolean
          phone: string | null
          pickup_address: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          store_of_week: boolean
          tagline: string | null
        }
        Insert: {
          application_text?: string | null
          applied_at?: string | null
          city?: string | null
          commission_rate?: number
          confirmation_timeout_minutes?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          driver_contact?: string | null
          email?: string | null
          featured_rank?: number | null
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          is_live?: boolean
          logo_url?: string | null
          name: string
          offers_gift_wrap?: boolean
          phone?: string | null
          pickup_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          store_of_week?: boolean
          tagline?: string | null
        }
        Update: {
          application_text?: string | null
          applied_at?: string | null
          city?: string | null
          commission_rate?: number
          confirmation_timeout_minutes?: number
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          driver_contact?: string | null
          email?: string | null
          featured_rank?: number | null
          id?: string
          is_demo?: boolean
          is_featured?: boolean
          is_live?: boolean
          logo_url?: string | null
          name?: string
          offers_gift_wrap?: boolean
          phone?: string | null
          pickup_address?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          store_of_week?: boolean
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_periods: {
        Row: {
          closed_at: string | null
          commission_total: number
          created_at: string
          gross_total: number
          id: string
          net_total: number
          note: string | null
          paid_at: string | null
          partner_id: string
          period_end: string
          period_start: string
          reference: string | null
          status: string
        }
        Insert: {
          closed_at?: string | null
          commission_total?: number
          created_at?: string
          gross_total?: number
          id?: string
          net_total?: number
          note?: string | null
          paid_at?: string | null
          partner_id: string
          period_end: string
          period_start: string
          reference?: string | null
          status?: string
        }
        Update: {
          closed_at?: string | null
          commission_total?: number
          created_at?: string
          gross_total?: number
          id?: string
          net_total?: number
          note?: string | null
          paid_at?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_periods_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_statements: {
        Row: {
          created_at: string
          id: string
          paid_at: string | null
          paid_method: string | null
          paid_reference: string | null
          partner_id: string
          period_end: string
          period_start: string
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_method?: string | null
          paid_reference?: string | null
          partner_id: string
          period_end: string
          period_start: string
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          paid_at?: string | null
          paid_method?: string | null
          paid_reference?: string | null
          partner_id?: string
          period_end?: string
          period_start?: string
          status?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_statements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      product_costs: {
        Row: {
          cost: number
          product_id: string
          updated_at: string
        }
        Insert: {
          cost: number
          product_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_costs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_hashtags: {
        Row: {
          colour: string
          created_at: string
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          colour?: string
          created_at?: string
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          colour?: string
          created_at?: string
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_hashtags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_delta: number
          product_id: string
          sku: string | null
          sort_order: number
          stock_quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_delta?: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_delta?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
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
          color: string | null
          color_is_placeholder: boolean
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
          price_is_placeholder: boolean
          recipient_tags: string[]
          review_status: string
          same_day: boolean
          sku: string | null
          slug: string
          stock_quantity: number
          subcategory_id: string | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          avg_rating?: number | null
          category_id: string
          color?: string | null
          color_is_placeholder?: boolean
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
          price_is_placeholder?: boolean
          recipient_tags?: string[]
          review_status?: string
          same_day?: boolean
          sku?: string | null
          slug: string
          stock_quantity?: number
          subcategory_id?: string | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          avg_rating?: number | null
          category_id?: string
          color?: string | null
          color_is_placeholder?: boolean
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
          price_is_placeholder?: boolean
          recipient_tags?: string[]
          review_status?: string
          same_day?: boolean
          sku?: string | null
          slug?: string
          stock_quantity?: number
          subcategory_id?: string | null
          tags?: string[]
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
          store_role: string
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
          store_role?: string
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
          store_role?: string
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
      reviews: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          order_item_id: string
          partner_id: string
          product_id: string
          rating: number
          status: string
          store_reply: string | null
          text: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          order_item_id: string
          partner_id: string
          product_id: string
          rating: number
          status?: string
          store_reply?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          order_item_id?: string
          partner_id?: string
          product_id?: string
          rating?: number
          status?: string
          store_reply?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_metrics: {
        Row: {
          avg_confirm_seconds: number | null
          cancelled_count: number
          commission_amount: number
          day: string
          delivered_count: number
          gross_revenue: number
          items_count: number
          net_revenue: number
          orders_count: number
          partner_id: string
          units_count: number
          updated_at: string
        }
        Insert: {
          avg_confirm_seconds?: number | null
          cancelled_count?: number
          commission_amount?: number
          day: string
          delivered_count?: number
          gross_revenue?: number
          items_count?: number
          net_revenue?: number
          orders_count?: number
          partner_id: string
          units_count?: number
          updated_at?: string
        }
        Update: {
          avg_confirm_seconds?: number | null
          cancelled_count?: number
          commission_amount?: number
          day?: string
          delivered_count?: number
          gross_revenue?: number
          items_count?: number
          net_revenue?: number
          orders_count?: number
          partner_id?: string
          units_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_metrics_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      store_owner_invites: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          note: string | null
          partner_id: string
          revoked_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          note?: string | null
          partner_id: string
          revoked_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          note?: string | null
          partner_id?: string
          revoked_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_owner_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_owner_invites_partner_id_fkey"
            columns: ["partner_id"]
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
          paid_method: string | null
          paid_reference: string | null
          payout_period_id: string | null
          statement_id: string | null
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
          paid_method?: string | null
          paid_reference?: string | null
          payout_period_id?: string | null
          statement_id?: string | null
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
          paid_method?: string | null
          paid_reference?: string | null
          payout_period_id?: string | null
          statement_id?: string | null
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
            foreignKeyName: "store_payables_payout_period_id_fkey"
            columns: ["payout_period_id"]
            isOneToOne: false
            referencedRelation: "payout_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_payables_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "payout_statements"
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
      support_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assignee: string | null
          created_at: string
          customer_id: string
          id: string
          message: string
          order_id: string | null
          status: string
          subject: string
        }
        Insert: {
          assignee?: string | null
          created_at?: string
          customer_id: string
          id?: string
          message: string
          order_id?: string | null
          status?: string
          subject?: string
        }
        Update: {
          assignee?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          message?: string
          order_id?: string | null
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          gift_card_id: string | null
          id: string
          kind: string
          note: string | null
          order_id: string | null
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          gift_card_id?: string | null
          id?: string
          kind: string
          note?: string | null
          order_id?: string | null
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          gift_card_id?: string | null
          id?: string
          kind?: string
          note?: string | null
          order_id?: string | null
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          card_number: string
          created_at: string
          currency: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          card_number: string
          created_at?: string
          currency?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          card_number?: string
          created_at?: string
          currency?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
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
      admin_customer_detail: { Args: { p_customer_id: string }; Returns: Json }
      admin_customers_list: {
        Args: {
          p_city?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          city: string
          customer_id: string
          full_name: string
          joined: string
          last_order: string
          orders: number
          phone: string
          total_count: number
          total_spent: number
        }[]
      }
      admin_finance_breakdown: {
        Args: { p_from: string; p_to: string }
        Returns: {
          commission: number
          day: string
          delivery_fees: number
          gmv: number
          orders: number
        }[]
      }
      admin_finance_by_store: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cancelled: number
          commission: number
          name: string
          orders: number
          partner_id: string
          payable: number
          sales: number
        }[]
      }
      admin_gift_cards_list: {
        Args: never
        Returns: {
          buyer_name: string
          code_last4: string
          created_at: string
          current_balance: number
          delivery_method: string
          expires_at: string
          id: string
          original_amount: number
          recipient_name: string
          status: string
        }[]
      }
      admin_home_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          active_customers: number
          avg_order_value: number
          cado_earned: number
          commission: number
          delivery_fees: number
          gmv: number
          had_previous: boolean
          orders: number
          owed_to_stores: number
          prev_active_customers: number
          prev_avg_order_value: number
          prev_cado_earned: number
          prev_commission: number
          prev_delivery_fees: number
          prev_gmv: number
          prev_orders: number
        }[]
      }
      admin_list_admins: {
        Args: never
        Returns: {
          email: string
          full_name: string
          since: string
          user_id: string
        }[]
      }
      admin_money_summary: {
        Args: never
        Returns: {
          gift_cards_active_count: number
          gift_cards_outstanding_liability: number
          gift_cards_pending_payment_total: number
          store_commission_total: number
          store_gross_total: number
          store_id: string
          store_name: string
          store_net_owed_total: number
          store_net_paid_total: number
          store_net_unpaid_total: number
        }[]
      }
      admin_new_customers: {
        Args: { p_from: string; p_to: string }
        Returns: {
          day: string
          new_customers: number
        }[]
      }
      admin_order_detail: { Args: { p_order_id: string }; Returns: Json }
      admin_order_status_counts: {
        Args: never
        Returns: {
          orders: number
          status: string
        }[]
      }
      admin_orders: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          customer_name: string
          delivery_fee: number
          discount: number
          order_id: string
          order_number: string
          payment_method: string
          payment_status: string
          placed_at: string
          sub_orders: Json
          subtotal: number
          total: number
        }[]
      }
      admin_orders_by_area: {
        Args: { p_from: string; p_to: string }
        Returns: {
          area: string
          orders: number
        }[]
      }
      admin_orders_page: {
        Args: {
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_partner?: string
          p_payment_method?: string
          p_payment_status?: string
          p_search?: string
          p_status?: string
          p_to?: string
        }
        Returns: {
          customer_name: string
          customer_phone: string
          item_count: number
          order_id: string
          order_number: string
          payment_method: string
          payment_status: string
          placed_at: string
          stores: Json
          total: number
          total_count: number
        }[]
      }
      admin_overview_stats: {
        Args: never
        Returns: {
          commission_all_time: number
          commission_this_month: number
          delivery_fees_all_time: number
          orders_all_time: number
          orders_this_month: number
          orders_today: number
          revenue_all_time: number
          revenue_this_month: number
          revenue_today: number
          sub_orders_by_status: Json
        }[]
      }
      admin_partner_totals: {
        Args: never
        Returns: {
          city: string
          commission: number
          commission_rate: number
          gross_revenue: number
          name: string
          orders_count: number
          owner_email: string
          partner_id: string
          payable_pending: number
          status: string
        }[]
      }
      admin_set_role_admin: {
        Args: { p_email: string; p_make_admin: boolean }
        Returns: string
      }
      admin_set_sub_order_status: {
        Args: { p_status: string; p_sub_order_id: string }
        Returns: undefined
      }
      admin_top_products: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          partner_name: string
          product_id: string
          revenue: number
          title: string
          units: number
        }[]
      }
      cado_is_open: { Args: never; Returns: boolean }
      cado_next_open_at: { Args: never; Returns: string }
      cancel_gift_card_pool: { Args: { p_pool_id: string }; Returns: undefined }
      cancel_unpaid_gift_card: {
        Args: { p_gift_card_id: string }
        Returns: undefined
      }
      check_gift_card_balance: {
        Args: { p_code: string }
        Returns: {
          card_message: string
          currency: string
          from_name: string
          remaining_balance: number
        }[]
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_per_minute?: number }
        Returns: undefined
      }
      confirm_gift_card_payment: {
        Args: { p_gift_card_id: string }
        Returns: undefined
      }
      confirm_pool_contribution: {
        Args: { p_contribution_id: string }
        Returns: undefined
      }
      contribute_to_pool: {
        Args: {
          p_amount_cents: number
          p_contributor_name: string
          p_hide_amount?: boolean
          p_message?: string
          p_payment_ref?: string
          p_slug: string
        }
        Returns: string
      }
      create_gift_card_pool: {
        Args: {
          p_allow_extra?: boolean
          p_deadline?: string
          p_goal_cents: number
          p_note_from?: string
          p_note_message?: string
          p_note_to?: string
          p_occasion: string
          p_recipient_name: string
        }
        Returns: string
      }
      current_client_ip: { Args: never; Returns: string }
      delivery_fee_usd: { Args: never; Returns: number }
      driver_my_deliveries: {
        Args: never
        Returns: {
          cod_amount: number
          drop_off: string
          items: number
          order_number: string
          pickup_address: string
          recipient_name: string
          recipient_phone: string
          status: string
          store_name: string
          store_phone: string
          sub_order_id: string
        }[]
      }
      driver_set_delivery_status: {
        Args: { p_status: string; p_sub_order_id: string }
        Returns: string
      }
      generate_card_number: { Args: never; Returns: string }
      generate_gift_card_code: { Args: never; Returns: string }
      generate_gift_card_pin: { Args: never; Returns: string }
      generate_pool_slug: { Args: never; Returns: string }
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
          color: string | null
          color_is_placeholder: boolean
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
          price_is_placeholder: boolean
          recipient_tags: string[]
          review_status: string
          same_day: boolean
          sku: string | null
          slug: string
          stock_quantity: number
          subcategory_id: string | null
          tags: string[]
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
      get_pool_by_slug: {
        Args: { p_slug: string }
        Returns: {
          confirmed_cents: number
          contributor_count: number
          contributors: Json
          deadline: string
          goal_cents: number
          is_organizer: boolean
          occasion: string
          pending_cents: number
          recipient_name: string
          slug: string
          status: string
        }[]
      }
      home_product_signals: {
        Args: { p_days?: number }
        Returns: {
          favorites: number
          product_id: string
          recent_orders: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_store_owner: { Args: never; Returns: boolean }
      is_valid_contact: { Args: { p_contact: string }; Returns: boolean }
      is_valid_email: { Args: { p_email: string }; Returns: boolean }
      issue_gift_card_internal: {
        Args: {
          p_amount: number
          p_buyer_email?: string
          p_buyer_id: string
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
      issue_pool_gift_card: {
        Args: { p_delivery_method?: string; p_pool_id: string }
        Returns: {
          code: string
          id: string
          original_amount: number
        }[]
      }
      list_refunds_required: {
        Args: never
        Returns: {
          amount_cents: number
          contribution_id: string
          contributor_name: string
          created_at: string
          payment_ref: string
          pool_slug: string
          recipient_name: string
        }[]
      }
      my_partner_id: { Args: never; Returns: string }
      my_wallet: {
        Args: never
        Returns: {
          balance: number
          card_number: string
          currency: string
        }[]
      }
      partner_is_active: { Args: { p_partner_id: string }; Returns: boolean }
      partner_order_context: {
        Args: { p_sub_order_id: string }
        Returns: {
          address_apartment: string
          address_area: string
          address_building: string
          address_city: string
          address_floor: string
          address_notes: string
          address_street: string
          delivery_slot: string
          gift_message: string
          hide_price: boolean
          is_gift: boolean
          order_number: string
          payment_method: string
          payment_status: string
          placed_at: string
          recipient_name: string
          recipient_phone: string
        }[]
      }
      place_gift_card_order: {
        Args: {
          p_address_source?: string
          p_delivery_address_id?: string
          p_delivery_time_slot?: string
          p_is_gift?: boolean
          p_notes?: string
          p_payment_method?: string
          p_recipient_name?: string
          p_recipient_phone?: string
        }
        Returns: string
      }
      place_order: {
        Args: {
          p_address_source?: string
          p_delivery_address_id?: string
          p_delivery_date?: string
          p_delivery_time_slot?: string
          p_gift_card_code?: string
          p_gift_message?: string
          p_hide_price?: boolean
          p_is_gift?: boolean
          p_notes?: string
          p_partner_id?: string
          p_payment_method?: string
          p_recipient_name?: string
          p_recipient_phone?: string
        }
        Returns: string
      }
      place_order_with_wallet: {
        Args: {
          p_address_source?: string
          p_delivery_address_id?: string
          p_delivery_date?: string
          p_delivery_time_slot?: string
          p_gift_card_code?: string
          p_gift_message?: string
          p_hide_price?: boolean
          p_is_gift?: boolean
          p_notes?: string
          p_partner_id?: string
          p_payment_method?: string
          p_recipient_name?: string
          p_recipient_phone?: string
          p_use_balance?: boolean
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
      rebuild_store_metrics: {
        Args: { p_from?: string; p_partner_id: string; p_to?: string }
        Returns: number
      }
      reconcile_gift_cards: {
        Args: never
        Returns: {
          actual_spent: number
          code: string
          discrepancy: number
          expected_spent: number
          gift_card_id: string
        }[]
      }
      record_order_event: {
        Args: {
          p_event_type: string
          p_from_status?: string
          p_message?: string
          p_order_id: string
          p_order_item_id: string
          p_partner_id: string
          p_payload?: Json
          p_sub_order_id: string
          p_to_status?: string
        }
        Returns: undefined
      }
      redeem_gift_card_to_wallet: {
        Args: { p_code: string; p_pin?: string }
        Returns: {
          new_balance: number
          redeemed: number
        }[]
      }
      refund_gift_card: { Args: { p_gift_card_id: string }; Returns: undefined }
      refund_wallet_balance: { Args: { p_order_id: string }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      spend_wallet_balance: {
        Args: { p_amount: number; p_order_id: string; p_profile_id: string }
        Returns: number
      }
      store_set_own_pause: { Args: { p_paused: boolean }; Returns: string }
      void_order_gift_cards: {
        Args: { p_order_id: string }
        Returns: {
          gift_card_id: string
          outcome: string
        }[]
      }
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
