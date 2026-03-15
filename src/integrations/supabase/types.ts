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
      activity_logs: {
        Row: {
          action_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tickets: {
        Row: {
          accommodation_co2: number
          accommodation_type: string | null
          agent_id: string
          created_at: string
          department: string
          destination_airport: string
          flight_co2: number
          from_date: string
          id: string
          invoice_url: string | null
          is_return: boolean
          ktb_payment_date: string | null
          ktb_payment_reference: string | null
          ktb_payment_status: Database["public"]["Enums"]["agent_ktb_payment_status"]
          lpo_number: string
          num_travelers: number
          offset_amount_paid: number
          origin_airport: string
          payment_date: string | null
          payment_reference: string | null
          pnr_number: string
          receipt_url: string | null
          staff_name: string
          ticket_issue_date: string
          ticket_number: string
          to_date: string | null
          total_co2: number
          travel_class: string
          tree_status: Database["public"]["Enums"]["agent_tree_status"]
          trees_needed: number
          trees_planted: number
          updated_at: string
        }
        Insert: {
          accommodation_co2?: number
          accommodation_type?: string | null
          agent_id: string
          created_at?: string
          department?: string
          destination_airport: string
          flight_co2?: number
          from_date: string
          id?: string
          invoice_url?: string | null
          is_return?: boolean
          ktb_payment_date?: string | null
          ktb_payment_reference?: string | null
          ktb_payment_status?: Database["public"]["Enums"]["agent_ktb_payment_status"]
          lpo_number: string
          num_travelers?: number
          offset_amount_paid?: number
          origin_airport: string
          payment_date?: string | null
          payment_reference?: string | null
          pnr_number: string
          receipt_url?: string | null
          staff_name: string
          ticket_issue_date: string
          ticket_number: string
          to_date?: string | null
          total_co2?: number
          travel_class?: string
          tree_status?: Database["public"]["Enums"]["agent_tree_status"]
          trees_needed?: number
          trees_planted?: number
          updated_at?: string
        }
        Update: {
          accommodation_co2?: number
          accommodation_type?: string | null
          agent_id?: string
          created_at?: string
          department?: string
          destination_airport?: string
          flight_co2?: number
          from_date?: string
          id?: string
          invoice_url?: string | null
          is_return?: boolean
          ktb_payment_date?: string | null
          ktb_payment_reference?: string | null
          ktb_payment_status?: Database["public"]["Enums"]["agent_ktb_payment_status"]
          lpo_number?: string
          num_travelers?: number
          offset_amount_paid?: number
          origin_airport?: string
          payment_date?: string | null
          payment_reference?: string | null
          pnr_number?: string
          receipt_url?: string | null
          staff_name?: string
          ticket_issue_date?: string
          ticket_number?: string
          to_date?: string | null
          total_co2?: number
          travel_class?: string
          tree_status?: Database["public"]["Enums"]["agent_tree_status"]
          trees_needed?: number
          trees_planted?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "travel_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_name: string
          key_prefix: string
          last_used: string | null
          organization_id: string
          rate_limit: number | null
          scopes: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_name: string
          key_prefix: string
          last_used?: string | null
          organization_id: string
          rate_limit?: number | null
          scopes?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_name?: string
          key_prefix?: string
          last_used?: string | null
          organization_id?: string
          rate_limit?: number | null
          scopes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_logs: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
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
      ephemeral_sessions: {
        Row: {
          consumed: boolean | null
          created_at: string
          expires_at: string
          id: string
          pledge_context: Json | null
          token_hash: string
        }
        Insert: {
          consumed?: boolean | null
          created_at?: string
          expires_at: string
          id?: string
          pledge_context?: Json | null
          token_hash: string
        }
        Update: {
          consumed?: boolean | null
          created_at?: string
          expires_at?: string
          id?: string
          pledge_context?: Json | null
          token_hash?: string
        }
        Relationships: []
      }
      integration_logs: {
        Row: {
          api_key_id: string | null
          duration_ms: number | null
          endpoint: string
          id: string
          ip_address: unknown
          method: string
          organization_id: string
          request_body: Json | null
          response_body: Json | null
          status_code: number
          timestamp: string | null
        }
        Insert: {
          api_key_id?: string | null
          duration_ms?: number | null
          endpoint: string
          id?: string
          ip_address?: unknown
          method: string
          organization_id: string
          request_body?: Json | null
          response_body?: Json | null
          status_code: number
          timestamp?: string | null
        }
        Update: {
          api_key_id?: string | null
          duration_ms?: number | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          method?: string
          organization_id?: string
          request_body?: Json | null
          response_body?: Json | null
          status_code?: number
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lodge_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_active_at: string
          lodge_id: string
          session_token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_active_at?: string
          lodge_id: string
          session_token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_active_at?: string
          lodge_id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lodge_sessions_lodge_id_fkey"
            columns: ["lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
        ]
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
          password_hash: string | null
          updated_at: string
          username: string | null
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
          password_hash?: string | null
          updated_at?: string
          username?: string | null
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
          password_hash?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      magic_tokens: {
        Row: {
          consumed_at: string | null
          created_at: string
          device_fingerprint: string | null
          email: string
          expires_at: string
          id: string
          pledge_context: Json | null
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email: string
          expires_at: string
          id?: string
          pledge_context?: Json | null
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          device_fingerprint?: string | null
          email?: string
          expires_at?: string
          id?: string
          pledge_context?: Json | null
          token_hash?: string
        }
        Relationships: []
      }
      module_permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_module_id: string | null
          route: string | null
          sort_order: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_module_id?: string | null
          route?: string | null
          sort_order?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_module_id?: string | null
          route?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_parent_module_id_fkey"
            columns: ["parent_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          priority: string | null
          read_at: string | null
          recipient_id: string | null
          recipient_type: string
          related_lodge_id: string | null
          related_tree_id: string | null
          related_trip_id: string | null
          title: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_type: string
          related_lodge_id?: string | null
          related_tree_id?: string | null
          related_trip_id?: string | null
          title: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          priority?: string | null
          read_at?: string | null
          recipient_id?: string | null
          recipient_type?: string
          related_lodge_id?: string | null
          related_tree_id?: string | null
          related_trip_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_lodge_id_fkey"
            columns: ["related_lodge_id"]
            isOneToOne: false
            referencedRelation: "lodges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_tree_id_fkey"
            columns: ["related_tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_trip_id_fkey"
            columns: ["related_trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          module_id: string
          organization_id: string
          permissions: Json | null
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id: string
          organization_id: string
          permissions?: Json | null
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          module_id?: string
          organization_id?: string
          permissions?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: Json | null
          api_key_hash: string | null
          api_webhook_url: string | null
          archived: boolean | null
          archived_at: string | null
          bank_account: Json | null
          category: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          has_api_access: boolean | null
          id: string
          is_active: boolean | null
          legal_name: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          onboarded_by: string | null
          onboarded_date: string | null
          partner_type_id: string | null
          payment_terms: string | null
          tax_id: string | null
          updated_at: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          address?: Json | null
          api_key_hash?: string | null
          api_webhook_url?: string | null
          archived?: boolean | null
          archived_at?: string | null
          bank_account?: Json | null
          category: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          has_api_access?: boolean | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          onboarded_by?: string | null
          onboarded_date?: string | null
          partner_type_id?: string | null
          payment_terms?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          address?: Json | null
          api_key_hash?: string | null
          api_webhook_url?: string | null
          archived?: boolean | null
          archived_at?: string | null
          bank_account?: Json | null
          category?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          has_api_access?: boolean | null
          id?: string
          is_active?: boolean | null
          legal_name?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          onboarded_by?: string | null
          onboarded_date?: string | null
          partner_type_id?: string | null
          payment_terms?: string | null
          tax_id?: string | null
          updated_at?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_partner_type_id_fkey"
            columns: ["partner_type_id"]
            isOneToOne: false
            referencedRelation: "partner_types"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          currency: string | null
          id: string
          invoice_url: string | null
          notes: string | null
          organization_id: string
          payment_date: string | null
          payment_method: string | null
          payment_status: string
          receipt_url: string | null
          related_tree_id: string | null
          related_trip_id: string | null
          related_user_id: string | null
          requested_at: string | null
          requested_by: string
          transaction_type: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          organization_id: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          receipt_url?: string | null
          related_tree_id?: string | null
          related_trip_id?: string | null
          related_user_id?: string | null
          requested_at?: string | null
          requested_by: string
          transaction_type: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          invoice_url?: string | null
          notes?: string | null
          organization_id?: string
          payment_date?: string | null
          payment_method?: string | null
          payment_status?: string
          receipt_url?: string | null
          related_tree_id?: string | null
          related_trip_id?: string | null
          related_user_id?: string | null
          requested_at?: string | null
          requested_by?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_types: {
        Row: {
          category: string
          created_at: string | null
          default_modules: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_api: boolean | null
          transaction_enabled: boolean | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_modules?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_api?: boolean | null
          transaction_enabled?: boolean | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_modules?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_api?: boolean | null
          transaction_enabled?: boolean | null
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          amount: number
          created_at: string
          document_urls: Json | null
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
          document_urls?: Json | null
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
          document_urls?: Json | null
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
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          name: string
          role_category: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          name: string
          role_category: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          name?: string
          role_category?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      travel_agent_sessions: {
        Row: {
          agent_id: string
          created_at: string
          expires_at: string
          id: string
          last_active_at: string
          session_token: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          expires_at: string
          id?: string
          last_active_at?: string
          session_token: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_active_at?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_agent_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "travel_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_agents: {
        Row: {
          business_name: string
          contact_phone: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          password_hash: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          business_name: string
          contact_phone?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          password_hash?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          business_name?: string
          contact_phone?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          password_hash?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "travel_agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_carers: {
        Row: {
          age: number | null
          associated_partner_id: string | null
          conservancy: string | null
          county: string | null
          created_at: string | null
          gender: string
          id: string
          marital_status: string | null
          name: string
          number_of_kids: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          associated_partner_id?: string | null
          conservancy?: string | null
          county?: string | null
          created_at?: string | null
          gender: string
          id?: string
          marital_status?: string | null
          name: string
          number_of_kids?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          associated_partner_id?: string | null
          conservancy?: string | null
          county?: string | null
          created_at?: string | null
          gender?: string
          id?: string
          marital_status?: string | null
          name?: string
          number_of_kids?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tree_carers_associated_partner_id_fkey"
            columns: ["associated_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          amount_paid: number
          created_at: string
          growth_notes: string | null
          id: string
          images: Json | null
          latitude: number | null
          location_name: string | null
          lodge_id: string | null
          longitude: number | null
          num_trees: number
          otot_id: string
          plant_date: string | null
          pledge_status:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          status: Database["public"]["Enums"]["tree_status_type"]
          tree_carer_id: string | null
          tree_type: string | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          growth_notes?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          location_name?: string | null
          lodge_id?: string | null
          longitude?: number | null
          num_trees?: number
          otot_id: string
          plant_date?: string | null
          pledge_status?:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          status?: Database["public"]["Enums"]["tree_status_type"]
          tree_carer_id?: string | null
          tree_type?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          growth_notes?: string | null
          id?: string
          images?: Json | null
          latitude?: number | null
          location_name?: string | null
          lodge_id?: string | null
          longitude?: number | null
          num_trees?: number
          otot_id?: string
          plant_date?: string | null
          pledge_status?:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type?: Database["public"]["Enums"]["purchase_type"]
          status?: Database["public"]["Enums"]["tree_status_type"]
          tree_carer_id?: string | null
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
            foreignKeyName: "trees_tree_carer_id_fkey"
            columns: ["tree_carer_id"]
            isOneToOne: false
            referencedRelation: "tree_carers"
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
          friendly_trip_id: string | null
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
          friendly_trip_id?: string | null
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
          friendly_trip_id?: string | null
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
          created_via: string | null
          email: string
          email_verified: boolean | null
          id: string
          last_login_at: string | null
          organization_id: string | null
          otot_id: string | null
          password_hash: string | null
          pledge_date: string | null
          pledge_status: boolean
          role_id: string | null
          total_donation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_via?: string | null
          email: string
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          organization_id?: string | null
          otot_id?: string | null
          password_hash?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          role_id?: string | null
          total_donation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_via?: string | null
          email?: string
          email_verified?: boolean | null
          id?: string
          last_login_at?: string | null
          organization_id?: string | null
          otot_id?: string | null
          password_hash?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          role_id?: string | null
          total_donation?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_tokens: { Args: never; Returns: undefined }
      get_user_organization: { Args: { user_id: string }; Returns: string }
      get_user_role: { Args: { input_user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agent_session_valid: {
        Args: { _agent_id: string; _session_token: string }
        Returns: boolean
      }
      is_institutional_partner: { Args: { user_id: string }; Returns: boolean }
      is_lodge_session_valid: {
        Args: { _lodge_id: string; _session_token: string }
        Returns: boolean
      }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      users_in_same_org: {
        Args: { user1_id: string; user2_id: string }
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
      agent_ktb_payment_status: "Payment Due" | "Paid"
      agent_tree_status: "Not Planted" | "Planted"
      app_role: "admin" | "user"
      certificate_type: "Pledge" | "Tree Planting"
      entry_source_type: "Manual" | "Integration"
      pledge_status_type:
        | "pending_email_confirmation"
        | "confirmed"
        | "completed"
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
      agent_ktb_payment_status: ["Payment Due", "Paid"],
      agent_tree_status: ["Not Planted", "Planted"],
      app_role: ["admin", "user"],
      certificate_type: ["Pledge", "Tree Planting"],
      entry_source_type: ["Manual", "Integration"],
      pledge_status_type: [
        "pending_email_confirmation",
        "confirmed",
        "completed",
      ],
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
