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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      certificates: {
        Row: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          certificate_url: string
          created_at: string
          id: string
          issued_date: string
          user_id: string
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["certificate_type"]
          certificate_url: string
          created_at?: string
          id?: string
          issued_date?: string
          user_id: string
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["certificate_type"]
          certificate_url?: string
          created_at?: string
          id?: string
          issued_date?: string
          user_id?: string
        }
        Relationships: []
      }
      lodges: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount: number
          created_at: string
          id: string
          lodge_id: string
          notes: string | null
          payment_date: string | null
          request_date: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          lodge_id: string
          notes?: string | null
          payment_date?: string | null
          request_date?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          lodge_id?: string
          notes?: string | null
          payment_date?: string | null
          request_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reimbursements_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          amount_paid: number
          created_at: string
          id: string
          images: Json | null
          latitude: number | null
          location_name: string | null
          lodge_id: string | null
          longitude: number | null
          num_trees: number
          otot_id: string
          plant_date: string | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          status: Database["public"]["Enums"]["tree_status_type"]
          tree_type: string | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          id?: string
          images?: Json | null
          latitude?: number | null
          location_name?: string | null
          lodge_id?: string | null
          longitude?: number | null
          num_trees?: number
          otot_id: string
          plant_date?: string | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          status?: Database["public"]["Enums"]["tree_status_type"]
          tree_type?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          id?: string
          images?: Json | null
          latitude?: number | null
          location_name?: string | null
          lodge_id?: string | null
          longitude?: number | null
          num_trees?: number
          otot_id?: string
          plant_date?: string | null
          purchase_type?: Database["public"]["Enums"]["purchase_type"]
          status?: Database["public"]["Enums"]["tree_status_type"]
          tree_type?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trees_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trees_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          accommodation_co2: number
          accommodation_type:
            | Database["public"]["Enums"]["accommodation_type"]
            | null
          created_at: string
          destination_airport: string
          entry_source: Database["public"]["Enums"]["entry_source_type"]
          flight_co2: number
          from_date: string
          id: string
          is_return: boolean
          num_travelers: number
          origin_airport: string
          to_date: string | null
          total_co2: number
          travel_class: Database["public"]["Enums"]["travel_class_type"]
          trees_needed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accommodation_co2?: number
          accommodation_type?:
            | Database["public"]["Enums"]["accommodation_type"]
            | null
          created_at?: string
          destination_airport: string
          entry_source?: Database["public"]["Enums"]["entry_source_type"]
          flight_co2?: number
          from_date: string
          id?: string
          is_return?: boolean
          num_travelers?: number
          origin_airport: string
          to_date?: string | null
          total_co2?: number
          travel_class: Database["public"]["Enums"]["travel_class_type"]
          trees_needed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accommodation_co2?: number
          accommodation_type?:
            | Database["public"]["Enums"]["accommodation_type"]
            | null
          created_at?: string
          destination_airport?: string
          entry_source?: Database["public"]["Enums"]["entry_source_type"]
          flight_co2?: number
          from_date?: string
          id?: string
          is_return?: boolean
          num_travelers?: number
          origin_airport?: string
          to_date?: string | null
          total_co2?: number
          travel_class?: Database["public"]["Enums"]["travel_class_type"]
          trees_needed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          otot_id: string | null
          pledge_date: string | null
          pledge_status: boolean
          total_donation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          otot_id?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          total_donation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          otot_id?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          total_donation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      accommodation_type:
        | "Hotel"
        | "Rental"
        | "Cruise Ship"
        | "Service Apartment"
        | "None"
      app_role: "admin" | "user"
      certificate_type: "Pledge" | "Tree Planting"
      entry_source_type: "Manual" | "Integration"
      purchase_type: "One-time" | "Subscription"
      travel_class_type: "Economy" | "Premium Economy" | "Business" | "First"
      tree_status_type:
        | "Waiting to be Assigned"
        | "Assigned"
        | "Sapling Planted"
        | "Being Mapped"
        | "Planted"
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
  public: {
    Enums: {
      accommodation_type: [
        "Hotel",
        "Rental",
        "Cruise Ship",
        "Service Apartment",
        "None",
      ],
      app_role: ["admin", "user"],
      certificate_type: ["Pledge", "Tree Planting"],
      entry_source_type: ["Manual", "Integration"],
      purchase_type: ["One-time", "Subscription"],
      travel_class_type: ["Economy", "Premium Economy", "Business", "First"],
      tree_status_type: [
        "Waiting to be Assigned",
        "Assigned",
        "Sapling Planted",
        "Being Mapped",
        "Planted",
      ],
    },
  },
} as const
