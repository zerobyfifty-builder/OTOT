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
      carbon_metrics_logs: {
        Row: {
          calculation_method: string | null
          co2_offset_actual_kg: number | null
          co2_offset_estimated_kg: number | null
          contribution_id: string
          created_at: string
          created_by: string | null
          id: string
          log_date: string
          notes: string | null
          photos: string[] | null
          recorded_by: string
          updated_at: string
        }
        Insert: {
          calculation_method?: string | null
          co2_offset_actual_kg?: number | null
          co2_offset_estimated_kg?: number | null
          contribution_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          log_date: string
          notes?: string | null
          photos?: string[] | null
          recorded_by: string
          updated_at?: string
        }
        Update: {
          calculation_method?: string | null
          co2_offset_actual_kg?: number | null
          co2_offset_estimated_kg?: number | null
          contribution_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          photos?: string[] | null
          recorded_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      carbon_offset_calculations: {
        Row: {
          config_id: string | null
          created_at: string | null
          donation_usd_per_tree: number
          flight_legs_json: Json
          horizon_years_used: number
          id: string
          rate_used_kg_per_year: number
          slider_max_this_session: number
          species_id: string | null
          survival_rate_used: number
          total_co2_kg: number
          total_contribution_usd: number
          tourist_id: string
          tree_credit_pct_after: number
          tree_debt_pct_after: number
          trees_chosen_this_session: number
          trees_committed_prior: number
          trees_needed: number
          trees_planted_prior: number
          trip_id: string | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string | null
          donation_usd_per_tree: number
          flight_legs_json: Json
          horizon_years_used: number
          id?: string
          rate_used_kg_per_year: number
          slider_max_this_session: number
          species_id?: string | null
          survival_rate_used: number
          total_co2_kg: number
          total_contribution_usd: number
          tourist_id: string
          tree_credit_pct_after: number
          tree_debt_pct_after: number
          trees_chosen_this_session: number
          trees_committed_prior?: number
          trees_needed: number
          trees_planted_prior?: number
          trip_id?: string | null
        }
        Update: {
          config_id?: string | null
          created_at?: string | null
          donation_usd_per_tree?: number
          flight_legs_json?: Json
          horizon_years_used?: number
          id?: string
          rate_used_kg_per_year?: number
          slider_max_this_session?: number
          species_id?: string | null
          survival_rate_used?: number
          total_co2_kg?: number
          total_contribution_usd?: number
          tourist_id?: string
          tree_credit_pct_after?: number
          tree_debt_pct_after?: number
          trees_chosen_this_session?: number
          trees_committed_prior?: number
          trees_needed?: number
          trees_planted_prior?: number
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carbon_offset_calculations_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "planting_cost_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carbon_offset_calculations_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "tree_sequestration_rates"
            referencedColumns: ["id"]
          },
        ]
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
      community_impact: {
        Row: {
          created_at: string | null
          families_supported: number | null
          id: string
          jobs_created: number | null
          notes: string | null
          nursery_income_kes: number | null
          reporting_period: string
          stakeholder_org_id: string
          updated_at: string | null
          women_employed: number | null
          youth_employed: number | null
        }
        Insert: {
          created_at?: string | null
          families_supported?: number | null
          id?: string
          jobs_created?: number | null
          notes?: string | null
          nursery_income_kes?: number | null
          reporting_period: string
          stakeholder_org_id: string
          updated_at?: string | null
          women_employed?: number | null
          youth_employed?: number | null
        }
        Update: {
          created_at?: string | null
          families_supported?: number | null
          id?: string
          jobs_created?: number | null
          notes?: string | null
          nursery_income_kes?: number | null
          reporting_period?: string
          stakeholder_org_id?: string
          updated_at?: string | null
          women_employed?: number | null
          youth_employed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_impact_stakeholder_org_id_fkey"
            columns: ["stakeholder_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_impact_logs: {
        Row: {
          avg_monthly_income_kes: number | null
          community_benefits: string | null
          contribution_id: string
          created_at: string
          created_by: string | null
          families_supported: number | null
          id: string
          jobs_created: number | null
          local_participants_count: number | null
          log_date: string
          nursery_income_kes: number | null
          photos: string[] | null
          recorded_by: string
          reporting_period: string | null
          reporting_period_end: string | null
          update_frequency: string | null
          updated_at: string
          women_employed: number | null
          youth_employed: number | null
        }
        Insert: {
          avg_monthly_income_kes?: number | null
          community_benefits?: string | null
          contribution_id: string
          created_at?: string
          created_by?: string | null
          families_supported?: number | null
          id?: string
          jobs_created?: number | null
          local_participants_count?: number | null
          log_date: string
          nursery_income_kes?: number | null
          photos?: string[] | null
          recorded_by: string
          reporting_period?: string | null
          reporting_period_end?: string | null
          update_frequency?: string | null
          updated_at?: string
          women_employed?: number | null
          youth_employed?: number | null
        }
        Update: {
          avg_monthly_income_kes?: number | null
          community_benefits?: string | null
          contribution_id?: string
          created_at?: string
          created_by?: string | null
          families_supported?: number | null
          id?: string
          jobs_created?: number | null
          local_participants_count?: number | null
          log_date?: string
          nursery_income_kes?: number | null
          photos?: string[] | null
          recorded_by?: string
          reporting_period?: string | null
          reporting_period_end?: string | null
          update_frequency?: string | null
          updated_at?: string
          women_employed?: number | null
          youth_employed?: number | null
        }
        Relationships: []
      }
      contribution_tracking: {
        Row: {
          acknowledgement_doc: string | null
          amount_paid: number
          amount_received: number | null
          amount_retained: number | null
          amount_transferred: number | null
          contribution_id: string
          contribution_type: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          institution_receipt_id: string | null
          institution_received_date: string | null
          ktb_fee_percent: number | null
          ktb_receipt_id: string | null
          ktb_received_date: string | null
          mktng_fee_allocated: number | null
          num_trees: number
          partner_receipt_confirmation: boolean | null
          partner_received_date: string | null
          payment_date: string | null
          payment_method: string | null
          plantation_partner_id: string | null
          status: string
          tech_fee_percent: number | null
          tech_fee_received: number | null
          tech_receipt_id: string | null
          tech_received_date: string | null
          tourist_name: string | null
          transaction_reference: string | null
          transfer_date: string | null
          transfer_mode: string | null
          transfer_reference: string | null
          tree_id: string | null
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledgement_doc?: string | null
          amount_paid?: number
          amount_received?: number | null
          amount_retained?: number | null
          amount_transferred?: number | null
          contribution_id: string
          contribution_type?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_receipt_id?: string | null
          institution_received_date?: string | null
          ktb_fee_percent?: number | null
          ktb_receipt_id?: string | null
          ktb_received_date?: string | null
          mktng_fee_allocated?: number | null
          num_trees?: number
          partner_receipt_confirmation?: boolean | null
          partner_received_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          plantation_partner_id?: string | null
          status?: string
          tech_fee_percent?: number | null
          tech_fee_received?: number | null
          tech_receipt_id?: string | null
          tech_received_date?: string | null
          tourist_name?: string | null
          transaction_reference?: string | null
          transfer_date?: string | null
          transfer_mode?: string | null
          transfer_reference?: string | null
          tree_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledgement_doc?: string | null
          amount_paid?: number
          amount_received?: number | null
          amount_retained?: number | null
          amount_transferred?: number | null
          contribution_id?: string
          contribution_type?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution_receipt_id?: string | null
          institution_received_date?: string | null
          ktb_fee_percent?: number | null
          ktb_receipt_id?: string | null
          ktb_received_date?: string | null
          mktng_fee_allocated?: number | null
          num_trees?: number
          partner_receipt_confirmation?: boolean | null
          partner_received_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          plantation_partner_id?: string | null
          status?: string
          tech_fee_percent?: number | null
          tech_fee_received?: number | null
          tech_receipt_id?: string | null
          tech_received_date?: string | null
          tourist_name?: string | null
          transaction_reference?: string | null
          transfer_date?: string | null
          transfer_mode?: string | null
          transfer_reference?: string | null
          tree_id?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_tracking_plantation_partner_id_fkey"
            columns: ["plantation_partner_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_tracking_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_tracking_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_impact_logs: {
        Row: {
          biodiversity_index: number | null
          contribution_id: string
          created_at: string
          created_by: string | null
          ecosystem_notes: string | null
          id: string
          log_date: string
          photos: string[] | null
          recorded_by: string
          soil_improvement: string | null
          updated_at: string
          water_retention: string | null
        }
        Insert: {
          biodiversity_index?: number | null
          contribution_id: string
          created_at?: string
          created_by?: string | null
          ecosystem_notes?: string | null
          id?: string
          log_date: string
          photos?: string[] | null
          recorded_by: string
          soil_improvement?: string | null
          updated_at?: string
          water_retention?: string | null
        }
        Update: {
          biodiversity_index?: number | null
          contribution_id?: string
          created_at?: string
          created_by?: string | null
          ecosystem_notes?: string | null
          id?: string
          log_date?: string
          photos?: string[] | null
          recorded_by?: string
          soil_improvement?: string | null
          updated_at?: string
          water_retention?: string | null
        }
        Relationships: []
      }
      engagement_activities: {
        Row: {
          activity_type: string
          actor_email: string | null
          actor_user_id: string | null
          contribution_id: string
          created_at: string
          description: string
          id: string
          metadata: Json
        }
        Insert: {
          activity_type: string
          actor_email?: string | null
          actor_user_id?: string | null
          contribution_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json
        }
        Update: {
          activity_type?: string
          actor_email?: string | null
          actor_user_id?: string | null
          contribution_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
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
      impact_metrics: {
        Row: {
          biodiversity_index: number | null
          calculation_method: string | null
          co2_offset_actual: number | null
          co2_offset_estimated: number | null
          community_benefits: string | null
          contribution_id: string
          created_at: string
          created_by: string | null
          id: string
          jobs_created: number | null
          local_participants_count: number | null
          soil_improvement_indicator: string | null
          updated_at: string
          water_retention_indicator: string | null
        }
        Insert: {
          biodiversity_index?: number | null
          calculation_method?: string | null
          co2_offset_actual?: number | null
          co2_offset_estimated?: number | null
          community_benefits?: string | null
          contribution_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          jobs_created?: number | null
          local_participants_count?: number | null
          soil_improvement_indicator?: string | null
          updated_at?: string
          water_retention_indicator?: string | null
        }
        Update: {
          biodiversity_index?: number | null
          calculation_method?: string | null
          co2_offset_actual?: number | null
          co2_offset_estimated?: number | null
          community_benefits?: string | null
          contribution_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          jobs_created?: number | null
          local_participants_count?: number | null
          soil_improvement_indicator?: string | null
          updated_at?: string
          water_retention_indicator?: string | null
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
      mdm_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by_user_id: string | null
          id: string
          module_id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by_user_id?: string | null
          id?: string
          module_id: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by_user_id?: string | null
          id?: string
          module_id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
        }
        Relationships: []
      }
      mdm_location_beats: {
        Row: {
          area_ha: number | null
          beat_code: string
          centroid_latitude: number | null
          centroid_longitude: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          station_id: string
          target_trees: number | null
          trees_planted: number | null
          updated_at: string | null
        }
        Insert: {
          area_ha?: number | null
          beat_code: string
          centroid_latitude?: number | null
          centroid_longitude?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          station_id: string
          target_trees?: number | null
          trees_planted?: number | null
          updated_at?: string | null
        }
        Update: {
          area_ha?: number | null
          beat_code?: string
          centroid_latitude?: number | null
          centroid_longitude?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          station_id?: string
          target_trees?: number | null
          trees_planted?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdm_location_beats_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "mdm_location_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      mdm_location_blocks: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          subcounty_id: string
          total_area_ha: number | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subcounty_id: string
          total_area_ha?: number | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subcounty_id?: string
          total_area_ha?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdm_location_blocks_subcounty_id_fkey"
            columns: ["subcounty_id"]
            isOneToOne: false
            referencedRelation: "mdm_location_subcounties"
            referencedColumns: ["id"]
          },
        ]
      }
      mdm_location_counties: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mdm_location_stations: {
        Row: {
          block_id: string
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          station_officer_name: string | null
          station_officer_phone: string | null
          updated_at: string | null
        }
        Insert: {
          block_id: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          station_officer_name?: string | null
          station_officer_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          block_id?: string
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          station_officer_name?: string | null
          station_officer_phone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdm_location_stations_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "mdm_location_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      mdm_location_subcounties: {
        Row: {
          code: string | null
          county_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          county_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          county_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mdm_location_subcounties_county_id_fkey"
            columns: ["county_id"]
            isOneToOne: false
            referencedRelation: "mdm_location_counties"
            referencedColumns: ["id"]
          },
        ]
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
          access_type: string
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
          access_type?: string
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
          access_type?: string
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
      monitoring_logs: {
        Row: {
          contribution_id: string
          created_at: string
          created_by: string | null
          id: string
          inspected_by: string
          inspection_date: string
          inspection_id: string
          notes: string | null
          photos: string[] | null
          updated_at: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          inspected_by: string
          inspection_date: string
          inspection_id: string
          notes?: string | null
          photos?: string[] | null
          updated_at?: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inspected_by?: string
          inspection_date?: string
          inspection_id?: string
          notes?: string | null
          photos?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      monitoring_records: {
        Row: {
          created_at: string | null
          height_cm: number | null
          id: string
          measurement_date: string
          notes: string | null
          original_count: number | null
          photos: Json | null
          planting_record_id: string
          survival_count: number | null
          survival_rate: number | null
        }
        Insert: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          measurement_date: string
          notes?: string | null
          original_count?: number | null
          photos?: Json | null
          planting_record_id: string
          survival_count?: number | null
          survival_rate?: number | null
        }
        Update: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          measurement_date?: string
          notes?: string | null
          original_count?: number | null
          photos?: Json | null
          planting_record_id?: string
          survival_count?: number | null
          survival_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_records_planting_record_id_fkey"
            columns: ["planting_record_id"]
            isOneToOne: false
            referencedRelation: "planting_records"
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
      nurseries: {
        Row: {
          address: string | null
          block_name: string
          capacity: number | null
          cbo_name: string
          county: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_kefri_certified: boolean | null
          kefri_reg_no: string | null
          location: string | null
          manager_email: string | null
          manager_name: string | null
          manager_phone: string | null
          nursery_type: string | null
          stakeholder_org_id: string
          sub_county: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          block_name: string
          capacity?: number | null
          cbo_name: string
          county?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_kefri_certified?: boolean | null
          kefri_reg_no?: string | null
          location?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          nursery_type?: string | null
          stakeholder_org_id: string
          sub_county?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          block_name?: string
          capacity?: number | null
          cbo_name?: string
          county?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_kefri_certified?: boolean | null
          kefri_reg_no?: string | null
          location?: string | null
          manager_email?: string | null
          manager_name?: string | null
          manager_phone?: string | null
          nursery_type?: string | null
          stakeholder_org_id?: string
          sub_county?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurseries_stakeholder_org_id_fkey"
            columns: ["stakeholder_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nursery_species: {
        Row: {
          availability_status: string
          created_at: string | null
          id: string
          notes: string | null
          nursery_id: string
          species_id: string
        }
        Insert: {
          availability_status?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          nursery_id: string
          species_id: string
        }
        Update: {
          availability_status?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          nursery_id?: string
          species_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nursery_species_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nursery_species_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "seed_species"
            referencedColumns: ["id"]
          },
        ]
      }
      org_job_role_defaults: {
        Row: {
          job_role: Database["public"]["Enums"]["org_job_role"]
          module_name: string
          permissions: Json
          stakeholder_type: string
          sub_features: Json
        }
        Insert: {
          job_role: Database["public"]["Enums"]["org_job_role"]
          module_name: string
          permissions?: Json
          stakeholder_type: string
          sub_features?: Json
        }
        Update: {
          job_role?: Database["public"]["Enums"]["org_job_role"]
          module_name?: string
          permissions?: Json
          stakeholder_type?: string
          sub_features?: Json
        }
        Relationships: []
      }
      org_user_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          module_name: string
          org_user_id: string
          permissions: Json
          sub_features: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_name: string
          org_user_id: string
          permissions?: Json
          sub_features?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          module_name?: string
          org_user_id?: string
          permissions?: Json
          sub_features?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_user_permissions_org_user_id_fkey"
            columns: ["org_user_id"]
            isOneToOne: false
            referencedRelation: "org_users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_users: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          job_role: Database["public"]["Enums"]["org_job_role"]
          joined_at: string | null
          last_name: string | null
          organization_id: string
          personal_message: string | null
          position: string | null
          status: Database["public"]["Enums"]["org_user_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          job_role: Database["public"]["Enums"]["org_job_role"]
          joined_at?: string | null
          last_name?: string | null
          organization_id: string
          personal_message?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["org_user_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          job_role?: Database["public"]["Enums"]["org_job_role"]
          joined_at?: string | null
          last_name?: string | null
          organization_id?: string
          personal_message?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["org_user_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      planting_cost_configs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          default_species_id: string | null
          donation_usd: number
          effective_from: string | null
          fx_rate_kes_usd: number
          id: string
          is_active: boolean | null
          ktb_share_of_balance_pct: number
          ktb_usd_per_tree: number
          moe_share_of_balance_pct: number
          moe_usd_per_tree: number
          submission_id: string | null
          tech_share_pct: number
          tech_usd_per_tree: number
          tier_adopt_usd: number
          tier_forest_usd: number
          tier_grove_usd: number
          tier_monthly_usd: number
          tier_plant_usd: number
          tier_recommit_usd: number
          tier_seedling_usd: number
          tier_yearly_usd: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          default_species_id?: string | null
          donation_usd?: number
          effective_from?: string | null
          fx_rate_kes_usd?: number
          id?: string
          is_active?: boolean | null
          ktb_share_of_balance_pct?: number
          ktb_usd_per_tree?: number
          moe_share_of_balance_pct?: number
          moe_usd_per_tree?: number
          submission_id?: string | null
          tech_share_pct?: number
          tech_usd_per_tree?: number
          tier_adopt_usd?: number
          tier_forest_usd?: number
          tier_grove_usd?: number
          tier_monthly_usd?: number
          tier_plant_usd?: number
          tier_recommit_usd?: number
          tier_seedling_usd?: number
          tier_yearly_usd?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          default_species_id?: string | null
          donation_usd?: number
          effective_from?: string | null
          fx_rate_kes_usd?: number
          id?: string
          is_active?: boolean | null
          ktb_share_of_balance_pct?: number
          ktb_usd_per_tree?: number
          moe_share_of_balance_pct?: number
          moe_usd_per_tree?: number
          submission_id?: string | null
          tech_share_pct?: number
          tech_usd_per_tree?: number
          tier_adopt_usd?: number
          tier_forest_usd?: number
          tier_grove_usd?: number
          tier_monthly_usd?: number
          tier_plant_usd?: number
          tier_recommit_usd?: number
          tier_seedling_usd?: number
          tier_yearly_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "planting_cost_configs_default_species_id_fkey"
            columns: ["default_species_id"]
            isOneToOne: false
            referencedRelation: "tree_sequestration_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_cost_configs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "planting_cost_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_cost_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          recipient_role: string
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          recipient_role: string
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_role?: string
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planting_cost_notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "planting_cost_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      planting_cost_submissions: {
        Row: {
          admin_comment: string | null
          cost_admin_overhead_kes: number
          cost_aftercare_yr1_kes: number
          cost_aftercare_yr2_kes: number
          cost_aftercare_yr3_kes: number
          cost_gps_mrv_kes: number
          cost_planting_kes: number
          cost_seedling_kes: number
          created_at: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          stakeholder_org: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_cost_kes: number
          updated_at: string | null
        }
        Insert: {
          admin_comment?: string | null
          cost_admin_overhead_kes?: number
          cost_aftercare_yr1_kes?: number
          cost_aftercare_yr2_kes?: number
          cost_aftercare_yr3_kes?: number
          cost_gps_mrv_kes?: number
          cost_planting_kes?: number
          cost_seedling_kes?: number
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stakeholder_org: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_cost_kes?: number
          updated_at?: string | null
        }
        Update: {
          admin_comment?: string | null
          cost_admin_overhead_kes?: number
          cost_aftercare_yr1_kes?: number
          cost_aftercare_yr2_kes?: number
          cost_aftercare_yr3_kes?: number
          cost_gps_mrv_kes?: number
          cost_planting_kes?: number
          cost_seedling_kes?: number
          created_at?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stakeholder_org?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_cost_kes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      planting_records: {
        Row: {
          beat: string | null
          block_name: string
          created_at: string | null
          date_planted: string
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          nursery_id: string | null
          planter_name: string | null
          seedlings_planted: number
          species_id: string | null
          stakeholder_org_id: string
          updated_at: string | null
        }
        Insert: {
          beat?: string | null
          block_name: string
          created_at?: string | null
          date_planted: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          nursery_id?: string | null
          planter_name?: string | null
          seedlings_planted?: number
          species_id?: string | null
          stakeholder_org_id: string
          updated_at?: string | null
        }
        Update: {
          beat?: string | null
          block_name?: string
          created_at?: string | null
          date_planted?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          nursery_id?: string | null
          planter_name?: string | null
          seedlings_planted?: number
          species_id?: string | null
          stakeholder_org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planting_records_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_records_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "seed_species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planting_records_stakeholder_org_id_fkey"
            columns: ["stakeholder_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      seed_species: {
        Row: {
          avg_height_mature_m: number | null
          category: string | null
          certification_source: string | null
          co2_sequestration_kg_year: number | null
          common_name: string | null
          created_at: string | null
          description: string | null
          growing_zone: string | null
          id: string
          is_active: boolean
          scientific_name: string | null
          species_name: string
          updated_at: string | null
        }
        Insert: {
          avg_height_mature_m?: number | null
          category?: string | null
          certification_source?: string | null
          co2_sequestration_kg_year?: number | null
          common_name?: string | null
          created_at?: string | null
          description?: string | null
          growing_zone?: string | null
          id?: string
          is_active?: boolean
          scientific_name?: string | null
          species_name: string
          updated_at?: string | null
        }
        Update: {
          avg_height_mature_m?: number | null
          category?: string | null
          certification_source?: string | null
          co2_sequestration_kg_year?: number | null
          common_name?: string | null
          created_at?: string | null
          description?: string | null
          growing_zone?: string | null
          id?: string
          is_active?: boolean
          scientific_name?: string | null
          species_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      seedling_batches: {
        Row: {
          created_at: string | null
          date_sown: string | null
          id: string
          nursery_id: string
          quantity: number
          species_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_sown?: string | null
          id?: string
          nursery_id: string
          quantity?: number
          species_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_sown?: string | null
          id?: string
          nursery_id?: string
          quantity?: number
          species_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seedling_batches_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seedling_batches_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "seed_species"
            referencedColumns: ["id"]
          },
        ]
      }
      stakeholder_disbursements: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          disbursement_date: string
          id: string
          ktb_transfer_reference: string | null
          notes: string | null
          reconciled_at: string | null
          reference: string | null
          stakeholder_org_id: string
          status: string | null
          tree_count: number | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          disbursement_date: string
          id?: string
          ktb_transfer_reference?: string | null
          notes?: string | null
          reconciled_at?: string | null
          reference?: string | null
          stakeholder_org_id: string
          status?: string | null
          tree_count?: number | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          disbursement_date?: string
          id?: string
          ktb_transfer_reference?: string | null
          notes?: string | null
          reconciled_at?: string | null
          reference?: string | null
          stakeholder_org_id?: string
          status?: string | null
          tree_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stakeholder_disbursements_stakeholder_org_id_fkey"
            columns: ["stakeholder_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          assigned_beats: string[] | null
          associated_partner_id: string | null
          cbo_nursery_id: string | null
          conservancy: string | null
          county: string | null
          created_at: string | null
          date_registered: string | null
          email: string | null
          experience_years: number | null
          gender: string
          id: string
          id_number: string | null
          marital_status: string | null
          name: string
          notes: string | null
          number_of_kids: number | null
          phone: string | null
          photo_url: string | null
          planter_type: string | null
          status: string
          sub_county: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          assigned_beats?: string[] | null
          associated_partner_id?: string | null
          cbo_nursery_id?: string | null
          conservancy?: string | null
          county?: string | null
          created_at?: string | null
          date_registered?: string | null
          email?: string | null
          experience_years?: number | null
          gender: string
          id?: string
          id_number?: string | null
          marital_status?: string | null
          name: string
          notes?: string | null
          number_of_kids?: number | null
          phone?: string | null
          photo_url?: string | null
          planter_type?: string | null
          status?: string
          sub_county?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          assigned_beats?: string[] | null
          associated_partner_id?: string | null
          cbo_nursery_id?: string | null
          conservancy?: string | null
          county?: string | null
          created_at?: string | null
          date_registered?: string | null
          email?: string | null
          experience_years?: number | null
          gender?: string
          id?: string
          id_number?: string | null
          marital_status?: string | null
          name?: string
          notes?: string | null
          number_of_kids?: number | null
          phone?: string | null
          photo_url?: string | null
          planter_type?: string | null
          status?: string
          sub_county?: string | null
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
          {
            foreignKeyName: "tree_carers_cbo_nursery_id_fkey"
            columns: ["cbo_nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_geotags: {
        Row: {
          created_at: string
          created_by: string | null
          geo_accuracy: number | null
          geo_tag_id: string
          id: string
          latitude: number
          longitude: number
          map_snapshot: string | null
          tree_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          geo_accuracy?: number | null
          geo_tag_id: string
          id?: string
          latitude: number
          longitude: number
          map_snapshot?: string | null
          tree_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          geo_accuracy?: number | null
          geo_tag_id?: string
          id?: string
          latitude?: number
          longitude?: number
          map_snapshot?: string | null
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_geotags_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: true
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_growth_metrics: {
        Row: {
          created_at: string
          created_by: string | null
          growth_stage: string
          id: string
          last_measured_date: string
          notes: string | null
          photos: string[] | null
          tree_age: string | null
          tree_age_months: number | null
          tree_height: string | null
          tree_height_cm: number | null
          tree_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          growth_stage?: string
          id?: string
          last_measured_date: string
          notes?: string | null
          photos?: string[] | null
          tree_age?: string | null
          tree_age_months?: number | null
          tree_height?: string | null
          tree_height_cm?: number | null
          tree_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          growth_stage?: string
          id?: string
          last_measured_date?: string
          notes?: string | null
          photos?: string[] | null
          tree_age?: string | null
          tree_age_months?: number | null
          tree_height?: string | null
          tree_height_cm?: number | null
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_growth_metrics_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_impact_records: {
        Row: {
          anniversary_date: string | null
          biodiversity_index: number | null
          calculation_method: string | null
          certificate_id: string | null
          certificate_issued_date: string | null
          certificate_url: string | null
          co2_offset_actual_kg: number | null
          co2_offset_estimated_kg: number | null
          community_benefits: string | null
          contribution_id: string
          created_at: string
          ecosystem_notes: string | null
          id: string
          jobs_created: number | null
          last_update_sent_date: string | null
          local_participants_count: number | null
          notification_status:
            | Database["public"]["Enums"]["notification_status_type"]
            | null
          soil_improvement: string | null
          update_frequency:
            | Database["public"]["Enums"]["update_frequency_type"]
            | null
          updated_at: string
          water_retention: string | null
        }
        Insert: {
          anniversary_date?: string | null
          biodiversity_index?: number | null
          calculation_method?: string | null
          certificate_id?: string | null
          certificate_issued_date?: string | null
          certificate_url?: string | null
          co2_offset_actual_kg?: number | null
          co2_offset_estimated_kg?: number | null
          community_benefits?: string | null
          contribution_id: string
          created_at?: string
          ecosystem_notes?: string | null
          id?: string
          jobs_created?: number | null
          last_update_sent_date?: string | null
          local_participants_count?: number | null
          notification_status?:
            | Database["public"]["Enums"]["notification_status_type"]
            | null
          soil_improvement?: string | null
          update_frequency?:
            | Database["public"]["Enums"]["update_frequency_type"]
            | null
          updated_at?: string
          water_retention?: string | null
        }
        Update: {
          anniversary_date?: string | null
          biodiversity_index?: number | null
          calculation_method?: string | null
          certificate_id?: string | null
          certificate_issued_date?: string | null
          certificate_url?: string | null
          co2_offset_actual_kg?: number | null
          co2_offset_estimated_kg?: number | null
          community_benefits?: string | null
          contribution_id?: string
          created_at?: string
          ecosystem_notes?: string | null
          id?: string
          jobs_created?: number | null
          last_update_sent_date?: string | null
          local_participants_count?: number | null
          notification_status?:
            | Database["public"]["Enums"]["notification_status_type"]
            | null
          soil_improvement?: string | null
          update_frequency?:
            | Database["public"]["Enums"]["update_frequency_type"]
            | null
          updated_at?: string
          water_retention?: string | null
        }
        Relationships: []
      }
      tree_monitoring_logs: {
        Row: {
          contribution_id: string
          created_at: string
          id: string
          inspected_by: string | null
          inspection_date: string
          overall_health_notes: string | null
          photos: Json | null
          survival_rate_pct: number | null
          trees_alive: number | null
          trees_dead: number | null
          trees_replaced: number | null
        }
        Insert: {
          contribution_id: string
          created_at?: string
          id?: string
          inspected_by?: string | null
          inspection_date: string
          overall_health_notes?: string | null
          photos?: Json | null
          survival_rate_pct?: number | null
          trees_alive?: number | null
          trees_dead?: number | null
          trees_replaced?: number | null
        }
        Update: {
          contribution_id?: string
          created_at?: string
          id?: string
          inspected_by?: string | null
          inspection_date?: string
          overall_health_notes?: string | null
          photos?: Json | null
          survival_rate_pct?: number | null
          trees_alive?: number | null
          trees_dead?: number | null
          trees_replaced?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tree_monitoring_logs_inspected_by_fkey"
            columns: ["inspected_by"]
            isOneToOne: false
            referencedRelation: "tree_carers"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_planting_assignments: {
        Row: {
          actual_planting_date: string | null
          assigned_date: string | null
          beat_id: string | null
          community_participants: number | null
          contribution_id: string
          created_at: string
          id: string
          land_type: string | null
          notes: string | null
          nursery_id: string | null
          planter_id: string | null
          planting_method: string | null
          planting_season: string | null
          rainfall_zone: string | null
          sapling_age_weeks: number | null
          sapling_count_allocated: number | null
          scheduled_planting_date: string | null
          soil_type: string | null
          species_id: string | null
          updated_at: string
        }
        Insert: {
          actual_planting_date?: string | null
          assigned_date?: string | null
          beat_id?: string | null
          community_participants?: number | null
          contribution_id: string
          created_at?: string
          id?: string
          land_type?: string | null
          notes?: string | null
          nursery_id?: string | null
          planter_id?: string | null
          planting_method?: string | null
          planting_season?: string | null
          rainfall_zone?: string | null
          sapling_age_weeks?: number | null
          sapling_count_allocated?: number | null
          scheduled_planting_date?: string | null
          soil_type?: string | null
          species_id?: string | null
          updated_at?: string
        }
        Update: {
          actual_planting_date?: string | null
          assigned_date?: string | null
          beat_id?: string | null
          community_participants?: number | null
          contribution_id?: string
          created_at?: string
          id?: string
          land_type?: string | null
          notes?: string | null
          nursery_id?: string | null
          planter_id?: string | null
          planting_method?: string | null
          planting_season?: string | null
          rainfall_zone?: string | null
          sapling_age_weeks?: number | null
          sapling_count_allocated?: number | null
          scheduled_planting_date?: string | null
          soil_type?: string | null
          species_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_planting_assignments_beat_id_fkey"
            columns: ["beat_id"]
            isOneToOne: false
            referencedRelation: "mdm_location_beats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_planting_assignments_nursery_id_fkey"
            columns: ["nursery_id"]
            isOneToOne: false
            referencedRelation: "nurseries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_planting_assignments_planter_id_fkey"
            columns: ["planter_id"]
            isOneToOne: false
            referencedRelation: "tree_carers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_planting_assignments_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "seed_species"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_sequestration_rates: {
        Row: {
          created_at: string | null
          data_source: string | null
          id: string
          is_active: boolean
          offset_horizon_years: number
          rate_kg_per_year_default: number
          rate_kg_per_year_max: number | null
          rate_kg_per_year_min: number | null
          scientific_name: string | null
          source_year: number | null
          species_category: string
          species_name: string
          survival_rate_override: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_active?: boolean
          offset_horizon_years?: number
          rate_kg_per_year_default: number
          rate_kg_per_year_max?: number | null
          rate_kg_per_year_min?: number | null
          scientific_name?: string | null
          source_year?: number | null
          species_category: string
          species_name: string
          survival_rate_override?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          id?: string
          is_active?: boolean
          offset_horizon_years?: number
          rate_kg_per_year_default?: number
          rate_kg_per_year_max?: number | null
          rate_kg_per_year_min?: number | null
          scientific_name?: string | null
          source_year?: number | null
          species_category?: string
          species_name?: string
          survival_rate_override?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tree_status_transitions: {
        Row: {
          contribution_id: string | null
          created_at: string
          created_by: string | null
          from_status: string | null
          id: string
          photos: string[] | null
          to_status: string
          transition_data: Json
          tree_id: string
        }
        Insert: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          photos?: string[] | null
          to_status: string
          transition_data?: Json
          tree_id: string
        }
        Update: {
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          from_status?: string | null
          id?: string
          photos?: string[] | null
          to_status?: string
          transition_data?: Json
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_status_transitions_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_survival_records: {
        Row: {
          contribution_id: string
          growth_stage: Database["public"]["Enums"]["growth_stage_type"] | null
          height_cm: number | null
          id: string
          last_checked_date: string | null
          notes: string | null
          survival_status:
            | Database["public"]["Enums"]["survival_status_type"]
            | null
          tree_id: string | null
          updated_at: string
        }
        Insert: {
          contribution_id: string
          growth_stage?: Database["public"]["Enums"]["growth_stage_type"] | null
          height_cm?: number | null
          id?: string
          last_checked_date?: string | null
          notes?: string | null
          survival_status?:
            | Database["public"]["Enums"]["survival_status_type"]
            | null
          tree_id?: string | null
          updated_at?: string
        }
        Update: {
          contribution_id?: string
          growth_stage?: Database["public"]["Enums"]["growth_stage_type"] | null
          height_cm?: number | null
          id?: string
          last_checked_date?: string | null
          notes?: string | null
          survival_status?:
            | Database["public"]["Enums"]["survival_status_type"]
            | null
          tree_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_survival_records_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_survival_tracking: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_checked_date: string
          notes: string | null
          survival_rate: number | null
          survival_status: string
          tree_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_date: string
          notes?: string | null
          survival_rate?: number | null
          survival_status?: string
          tree_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_checked_date?: string
          notes?: string | null
          survival_rate?: number | null
          survival_status?: string
          tree_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_survival_tracking_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          amount_paid: number
          contribution_id: string | null
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
          payment_method: string | null
          plant_date: string | null
          planting_status:
            | Database["public"]["Enums"]["planting_progress_type"]
            | null
          pledge_status:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          stakeholder_org_id: string | null
          status: Database["public"]["Enums"]["tree_status_type"]
          tree_carer_id: string | null
          tree_type: string | null
          trip_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          contribution_id?: string | null
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
          payment_method?: string | null
          plant_date?: string | null
          planting_status?:
            | Database["public"]["Enums"]["planting_progress_type"]
            | null
          pledge_status?:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type: Database["public"]["Enums"]["purchase_type"]
          stakeholder_org_id?: string | null
          status?: Database["public"]["Enums"]["tree_status_type"]
          tree_carer_id?: string | null
          tree_type?: string | null
          trip_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          contribution_id?: string | null
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
          payment_method?: string | null
          plant_date?: string | null
          planting_status?:
            | Database["public"]["Enums"]["planting_progress_type"]
            | null
          pledge_status?:
            | Database["public"]["Enums"]["pledge_status_type"]
            | null
          purchase_type?: Database["public"]["Enums"]["purchase_type"]
          stakeholder_org_id?: string | null
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
            foreignKeyName: "trees_stakeholder_org_id_fkey"
            columns: ["stakeholder_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          country: string | null
          created_at: string
          created_via: string | null
          date_of_birth: string | null
          email: string
          email_verified: boolean | null
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          organization_id: string | null
          otot_id: string | null
          password_hash: string | null
          phone_number: string | null
          pledge_date: string | null
          pledge_status: boolean
          profile_photo_url: string | null
          role_id: string | null
          total_donation: number
          updated_at: string
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          created_via?: string | null
          date_of_birth?: string | null
          email: string
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          organization_id?: string | null
          otot_id?: string | null
          password_hash?: string | null
          phone_number?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          profile_photo_url?: string | null
          role_id?: string | null
          total_donation?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          created_via?: string | null
          date_of_birth?: string | null
          email?: string
          email_verified?: boolean | null
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          organization_id?: string | null
          otot_id?: string | null
          password_hash?: string | null
          phone_number?: string | null
          pledge_date?: string | null
          pledge_status?: boolean
          profile_photo_url?: string | null
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
      wallet_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
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
      is_org_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_stakeholder: { Args: { user_id: string }; Returns: boolean }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      stakeholder_has_module: {
        Args: { _module_name: string; _user_id: string }
        Returns: boolean
      }
      stakeholder_has_module_permission: {
        Args: { _module_name: string; _permission: string; _user_id: string }
        Returns: boolean
      }
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
      growth_stage_type: "Sapling" | "Young" | "Maturing" | "Mature"
      notification_status_type: "Pending" | "Scheduled" | "Sent"
      org_job_role:
        | "field_ops"
        | "expert"
        | "operations_manager"
        | "project_manager"
        | "community_coordinator"
        | "impact_analyst"
        | "finance"
        | "org_admin"
        | "user"
        | "marketing"
      org_user_status: "pending" | "active" | "deactivated"
      planting_progress_type:
        | "pending_allocation"
        | "allocated"
        | "funds_pending"
        | "funds_received"
        | "planting_in_progress"
        | "planted"
        | "monitored"
        | "waiting_to_be_assigned"
        | "site_prepared"
        | "saplings_ready"
        | "planting_scheduled"
        | "sapling_planted"
        | "being_mapped"
        | "verified"
        | "dead"
        | "assigned"
      pledge_status_type:
        | "pending_email_confirmation"
        | "confirmed"
        | "completed"
      purchase_type: "One-time" | "Subscription"
      survival_status_type: "Alive" | "Dead" | "Replaced"
      travel_class_type: "Economy" | "Premium Economy" | "Business" | "First"
      tree_status_type:
        | "Waiting to be Assigned"
        | "Assigned"
        | "Sapling Planted"
        | "Being Mapped"
        | "Planted"
      update_frequency_type: "Monthly" | "Quarterly" | "Annually"
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
      growth_stage_type: ["Sapling", "Young", "Maturing", "Mature"],
      notification_status_type: ["Pending", "Scheduled", "Sent"],
      org_job_role: [
        "field_ops",
        "expert",
        "operations_manager",
        "project_manager",
        "community_coordinator",
        "impact_analyst",
        "finance",
        "org_admin",
        "user",
        "marketing",
      ],
      org_user_status: ["pending", "active", "deactivated"],
      planting_progress_type: [
        "pending_allocation",
        "allocated",
        "funds_pending",
        "funds_received",
        "planting_in_progress",
        "planted",
        "monitored",
        "waiting_to_be_assigned",
        "site_prepared",
        "saplings_ready",
        "planting_scheduled",
        "sapling_planted",
        "being_mapped",
        "verified",
        "dead",
        "assigned",
      ],
      pledge_status_type: [
        "pending_email_confirmation",
        "confirmed",
        "completed",
      ],
      purchase_type: ["One-time", "Subscription"],
      survival_status_type: ["Alive", "Dead", "Replaced"],
      travel_class_type: ["Economy", "Premium Economy", "Business", "First"],
      tree_status_type: [
        "Waiting to be Assigned",
        "Assigned",
        "Sapling Planted",
        "Being Mapped",
        "Planted",
      ],
      update_frequency_type: ["Monthly", "Quarterly", "Annually"],
    },
  },
} as const
