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
          created_at: string
          customer_id: string
          delivery_address_id: string
          delivery_fee: number
          id: string
          notes: string | null
          order_number: string
          payment_method: string
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          delivery_address_id: string
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string
          subtotal: number
          total: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          delivery_address_id?: string
          delivery_fee?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string
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
        ]
      }
      partners: {
        Row: {
          city: string | null
          country: string
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: string
        }
        Insert: {
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: string
        }
        Update: {
          city?: string | null
          country?: string
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
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
          sku: string | null
          slug: string
          stock_quantity: number
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
          sku?: string | null
          slug: string
          stock_quantity?: number
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
          sku?: string | null
          slug?: string
          stock_quantity?: number
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
          sku: string | null
          slug: string
          stock_quantity: number
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
          p_delivery_address_id: string
          p_delivery_date?: string
          p_delivery_time_slot?: string
          p_notes?: string
        }
        Returns: string
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
