// AUTOGENEROWANE z żywej bazy (introspekcja). Nie edytować ręcznie.
// Regeneracja: pnpm gen:types (patrz scripts/gen-types.mjs).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      adblue_log_revisions: {
        Row: {
          id: string;
          adblue_log_id: string;
          revision: number;
          snapshot: Json;
          edited_by: string | null;
          edited_at: string;
        };
        Insert: {
          id?: string;
          adblue_log_id: string;
          revision: number;
          snapshot: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Update: {
          id?: string;
          adblue_log_id?: string;
          revision?: number;
          snapshot?: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Relationships: [];
      };
      adblue_logs: {
        Row: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          station_country: string;
          station_city: string | null;
          station_loc: string | null;
          geo: unknown | null;
          odometer_km: number;
          liters: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          fuel_card_id: string | null;
          price_total: number | null;
          comment: string | null;
          device_id: string | null;
          revision: number;
          created_at: string;
          updated_at: string;
          synced_at: string | null;
          is_full: boolean;
          station_postcode: string | null;
          station_company: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          station_country: string;
          station_city?: string | null;
          station_loc?: string | null;
          geo?: unknown | null;
          odometer_km: number;
          liters: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          fuel_card_id?: string | null;
          price_total?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          is_full?: boolean;
          station_postcode?: string | null;
          station_company?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_id?: string;
          vehicle_id?: string;
          station_country?: string;
          station_city?: string | null;
          station_loc?: string | null;
          geo?: unknown | null;
          odometer_km?: number;
          liters?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          fuel_card_id?: string | null;
          price_total?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          is_full?: boolean;
          station_postcode?: string | null;
          station_company?: string | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          company_id: string | null;
          actor_id: string | null;
          action: string;
          target: string | null;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          actor_id?: string | null;
          action: string;
          target?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          actor_id?: string | null;
          action?: string;
          target?: string | null;
          meta?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      card_assignments: {
        Row: {
          id: string;
          fuel_card_id: string;
          user_id: string | null;
          vehicle_id: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          fuel_card_id: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          fuel_card_id?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      chat_members: {
        Row: {
          thread_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      chat_threads: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          created_by?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      checklist_submissions: {
        Row: {
          id: string;
          company_id: string;
          template_id: string | null;
          template_name: string;
          driver_id: string | null;
          driver_user_id: string | null;
          driver_label: string;
          vehicle_id: string | null;
          answers: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          template_id?: string | null;
          template_name?: string;
          driver_id?: string | null;
          driver_user_id?: string | null;
          driver_label?: string;
          vehicle_id?: string | null;
          answers?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          template_id?: string | null;
          template_name?: string;
          driver_id?: string | null;
          driver_user_id?: string | null;
          driver_label?: string;
          vehicle_id?: string | null;
          answers?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      checklist_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          items: Json;
          active: boolean;
          created_at: string;
          updated_at: string;
          assigned_drivers: string[];
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          items?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          assigned_drivers?: string[];
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          items?: Json;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
          assigned_drivers?: string[];
        };
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          tax_id: string | null;
          address: string | null;
          country: string | null;
          created_at: string;
          updated_at: string;
          default_vat_rate: number;
          payment_due_days: number;
          bank_name: string | null;
          bank_account: string | null;
          notify_days_ahead: number;
        };
        Insert: {
          id?: string;
          name: string;
          tax_id?: string | null;
          address?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string;
          default_vat_rate?: number;
          payment_due_days?: number;
          bank_name?: string | null;
          bank_account?: string | null;
          notify_days_ahead?: number;
        };
        Update: {
          id?: string;
          name?: string;
          tax_id?: string | null;
          address?: string | null;
          country?: string | null;
          created_at?: string;
          updated_at?: string;
          default_vat_rate?: number;
          payment_due_days?: number;
          bank_name?: string | null;
          bank_account?: string | null;
          notify_days_ahead?: number;
        };
        Relationships: [];
      };
      company_settlement_settings: {
        Row: {
          company_id: string;
          daily_rate: number;
          km_norm_per_day: number;
          km_rate: number;
          insurance_per_day: number;
          phone_monthly: number;
          doc_bonus_monthly: number;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          daily_rate?: number;
          km_norm_per_day?: number;
          km_rate?: number;
          insurance_per_day?: number;
          phone_monthly?: number;
          doc_bonus_monthly?: number;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          daily_rate?: number;
          km_norm_per_day?: number;
          km_rate?: number;
          insurance_per_day?: number;
          phone_monthly?: number;
          doc_bonus_monthly?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      contractors: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          tax_id: string | null;
          address: string | null;
          country: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          tax_id?: string | null;
          address?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          tax_id?: string | null;
          address?: string | null;
          country?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      damage_claims: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string | null;
          driver_name: string | null;
          claim_date: string;
          kind: string;
          status: string;
          description: string | null;
          cost: number | null;
          currency: string;
          insurer: string | null;
          claim_number: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id?: string | null;
          driver_name?: string | null;
          claim_date?: string;
          kind?: string;
          status?: string;
          description?: string | null;
          cost?: number | null;
          currency?: string;
          insurer?: string | null;
          claim_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string | null;
          driver_name?: string | null;
          claim_date?: string;
          kind?: string;
          status?: string;
          description?: string | null;
          cost?: number | null;
          currency?: string;
          insurer?: string | null;
          claim_number?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string | null;
          name: string;
          path: string;
          size_bytes: number | null;
          mime: string | null;
          category: string | null;
          expiry_date: string | null;
          uploaded_by: string | null;
          created_at: string;
          visibility: string;
          allowed_user_ids: string[];
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id?: string | null;
          name: string;
          path: string;
          size_bytes?: number | null;
          mime?: string | null;
          category?: string | null;
          expiry_date?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          visibility?: string;
          allowed_user_ids?: string[];
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string | null;
          name?: string;
          path?: string;
          size_bytes?: number | null;
          mime?: string | null;
          category?: string | null;
          expiry_date?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          visibility?: string;
          allowed_user_ids?: string[];
        };
        Relationships: [];
      };
      driver_assignments: {
        Row: {
          id: string;
          vehicle_id: string;
          user_id: string;
          valid_from: string | null;
          valid_to: string | null;
          active: boolean;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          user_id: string;
          valid_from?: string | null;
          valid_to?: string | null;
          active?: boolean;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          user_id?: string;
          valid_from?: string | null;
          valid_to?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      driver_expenses: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          vehicle_id: string | null;
          category: string;
          amount: number;
          currency: string;
          expense_date: string;
          note: string | null;
          photo_path: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id?: string;
          vehicle_id?: string | null;
          category: string;
          amount: number;
          currency?: string;
          expense_date?: string;
          note?: string | null;
          photo_path?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          vehicle_id?: string | null;
          category?: string;
          amount?: number;
          currency?: string;
          expense_date?: string;
          note?: string | null;
          photo_path?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      driver_payouts: {
        Row: {
          id: string;
          company_id: string;
          driver_name: string | null;
          kind: string;
          amount: number;
          currency: string;
          entry_date: string;
          note: string | null;
          created_by: string | null;
          created_at: string;
          driver_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          driver_name?: string | null;
          kind: string;
          amount: number;
          currency?: string;
          entry_date?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_name?: string | null;
          kind?: string;
          amount?: number;
          currency?: string;
          entry_date?: string;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Relationships: [];
      };
      driver_positions: {
        Row: {
          user_id: string;
          company_id: string;
          lat: number;
          lng: number;
          speed_kmh: number | null;
          heading: number | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          company_id: string;
          lat: number;
          lng: number;
          speed_kmh?: number | null;
          heading?: number | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: string;
          lat?: number;
          lng?: number;
          speed_kmh?: number | null;
          heading?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      driver_profiles: {
        Row: {
          user_id: string;
          company_name: string | null;
          qualifications: Json | null;
          comment: string | null;
          phone_enc: string | null;
          email_enc: string | null;
          company_data_enc: string | null;
        };
        Insert: {
          user_id: string;
          company_name?: string | null;
          qualifications?: Json | null;
          comment?: string | null;
          phone_enc?: string | null;
          email_enc?: string | null;
          company_data_enc?: string | null;
        };
        Update: {
          user_id?: string;
          company_name?: string | null;
          qualifications?: Json | null;
          comment?: string | null;
          phone_enc?: string | null;
          email_enc?: string | null;
          company_data_enc?: string | null;
        };
        Relationships: [];
      };
      driver_routes: {
        Row: {
          id: string;
          company_id: string;
          driver_id: string;
          driver_user_id: string | null;
          name: string;
          stops: Json;
          geometry: Json;
          summary: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          driver_id: string;
          driver_user_id?: string | null;
          name?: string;
          stops?: Json;
          geometry?: Json;
          summary?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_id?: string;
          driver_user_id?: string | null;
          name?: string;
          stops?: Json;
          geometry?: Json;
          summary?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      driver_tacho_events: {
        Row: {
          id: string;
          company_id: string;
          driver_user_id: string;
          kind: string;
          rest_type: string | null;
          at: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          driver_user_id: string;
          kind: string;
          rest_type?: string | null;
          at?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_user_id?: string;
          kind?: string;
          rest_type?: string | null;
          at?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      drivers: {
        Row: {
          id: string;
          company_id: string;
          license_categories: string[];
          qualifications: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
          id_card_enc: string | null;
          passport_enc: string | null;
          license_enc: string | null;
          first_name_enc: string | null;
          last_name_enc: string | null;
          birth_date_enc: string | null;
          license_expiry: string | null;
          code95_expiry: string | null;
          medical_expiry: string | null;
          adr_expiry: string | null;
          user_id: string | null;
          psychotech_expiry: string | null;
          passport_expiry: string | null;
          id_card_expiry: string | null;
          qualification_details: Json | null;
          company_name: string | null;
          company_tax_id: string | null;
          company_regon: string | null;
          company_address: string | null;
          company_activity: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          license_categories?: string[];
          qualifications?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          id_card_enc?: string | null;
          passport_enc?: string | null;
          license_enc?: string | null;
          first_name_enc?: string | null;
          last_name_enc?: string | null;
          birth_date_enc?: string | null;
          license_expiry?: string | null;
          code95_expiry?: string | null;
          medical_expiry?: string | null;
          adr_expiry?: string | null;
          user_id?: string | null;
          psychotech_expiry?: string | null;
          passport_expiry?: string | null;
          id_card_expiry?: string | null;
          qualification_details?: Json | null;
          company_name?: string | null;
          company_tax_id?: string | null;
          company_regon?: string | null;
          company_address?: string | null;
          company_activity?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          license_categories?: string[];
          qualifications?: string[];
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          id_card_enc?: string | null;
          passport_enc?: string | null;
          license_enc?: string | null;
          first_name_enc?: string | null;
          last_name_enc?: string | null;
          birth_date_enc?: string | null;
          license_expiry?: string | null;
          code95_expiry?: string | null;
          medical_expiry?: string | null;
          adr_expiry?: string | null;
          user_id?: string | null;
          psychotech_expiry?: string | null;
          passport_expiry?: string | null;
          id_card_expiry?: string | null;
          qualification_details?: Json | null;
          company_name?: string | null;
          company_tax_id?: string | null;
          company_regon?: string | null;
          company_address?: string | null;
          company_activity?: string | null;
        };
        Relationships: [];
      };
      expo_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          token: string;
          platform: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id?: string | null;
          token: string;
          platform?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string | null;
          token?: string;
          platform?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      fuel_cards: {
        Row: {
          id: string;
          company_id: string;
          provider: Database["public"]["Enums"]["fuel_card_provider"];
          card_number_masked: string;
          pin_encrypted: string | null;
          valid_until: string | null;
          discount_percent: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
          vehicle_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          provider: Database["public"]["Enums"]["fuel_card_provider"];
          card_number_masked: string;
          pin_encrypted?: string | null;
          valid_until?: string | null;
          discount_percent?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          provider?: Database["public"]["Enums"]["fuel_card_provider"];
          card_number_masked?: string;
          pin_encrypted?: string | null;
          valid_until?: string | null;
          discount_percent?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          vehicle_id?: string | null;
        };
        Relationships: [];
      };
      fuel_log_revisions: {
        Row: {
          id: string;
          fuel_log_id: string;
          revision: number;
          snapshot: Json;
          edited_by: string | null;
          edited_at: string;
        };
        Insert: {
          id?: string;
          fuel_log_id: string;
          revision: number;
          snapshot: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Update: {
          id?: string;
          fuel_log_id?: string;
          revision?: number;
          snapshot?: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Relationships: [];
      };
      fuel_logs: {
        Row: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          station_country: string;
          station_city: string | null;
          station_loc: string | null;
          geo: unknown | null;
          odometer_km: number;
          liters: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          fuel_card_id: string | null;
          price_total: number | null;
          comment: string | null;
          device_id: string | null;
          revision: number;
          created_at: string;
          updated_at: string;
          synced_at: string | null;
          is_full: boolean;
          station_postcode: string | null;
          station_company: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          station_country: string;
          station_city?: string | null;
          station_loc?: string | null;
          geo?: unknown | null;
          odometer_km: number;
          liters: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          fuel_card_id?: string | null;
          price_total?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          is_full?: boolean;
          station_postcode?: string | null;
          station_company?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_id?: string;
          vehicle_id?: string;
          station_country?: string;
          station_city?: string | null;
          station_loc?: string | null;
          geo?: unknown | null;
          odometer_km?: number;
          liters?: number;
          payment_method?: Database["public"]["Enums"]["payment_method"];
          fuel_card_id?: string | null;
          price_total?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          is_full?: boolean;
          station_postcode?: string | null;
          station_company?: string | null;
        };
        Relationships: [];
      };
      fuel_prices: {
        Row: {
          id: string;
          poi_id: string | null;
          fuel_type: string;
          price: number;
          currency: string;
          reported_at: string;
          source: string | null;
          reported_by: string | null;
        };
        Insert: {
          id?: string;
          poi_id?: string | null;
          fuel_type?: string;
          price: number;
          currency?: string;
          reported_at?: string;
          source?: string | null;
          reported_by?: string | null;
        };
        Update: {
          id?: string;
          poi_id?: string | null;
          fuel_type?: string;
          price?: number;
          currency?: string;
          reported_at?: string;
          source?: string | null;
          reported_by?: string | null;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string | null;
          role: Database["public"]["Enums"]["role"];
          token_hash: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          email_enc: string | null;
          permissions: Json;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id?: string | null;
          role?: Database["public"]["Enums"]["role"];
          token_hash: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          email_enc?: string | null;
          permissions?: Json;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string | null;
          role?: Database["public"]["Enums"]["role"];
          token_hash?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          email_enc?: string | null;
          permissions?: Json;
        };
        Relationships: [];
      };
      invoice_items: {
        Row: {
          id: string;
          invoice_id: string;
          position: number;
          description: string;
          quantity: number;
          unit_price: number;
          vat_rate: number;
          net: number;
          vat_amount: number;
          gross: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          position?: number;
          description: string;
          quantity?: number;
          unit_price?: number;
          vat_rate?: number;
          net?: number;
          vat_amount?: number;
          gross?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          position?: number;
          description?: string;
          quantity?: number;
          unit_price?: number;
          vat_rate?: number;
          net?: number;
          vat_amount?: number;
          gross?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          order_id: string | null;
          number: string;
          issue_date: string;
          seller_name: string | null;
          seller_tax_id: string | null;
          seller_address: string | null;
          buyer_name: string | null;
          buyer_tax_id: string | null;
          buyer_address: string | null;
          description: string | null;
          net: number;
          vat_rate: number;
          vat_amount: number;
          gross: number;
          currency: string;
          created_at: string;
          status: string;
          due_date: string | null;
          paid_at: string | null;
          seller_bank: string | null;
          seller_account: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          order_id?: string | null;
          number: string;
          issue_date?: string;
          seller_name?: string | null;
          seller_tax_id?: string | null;
          seller_address?: string | null;
          buyer_name?: string | null;
          buyer_tax_id?: string | null;
          buyer_address?: string | null;
          description?: string | null;
          net?: number;
          vat_rate?: number;
          vat_amount?: number;
          gross?: number;
          currency?: string;
          created_at?: string;
          status?: string;
          due_date?: string | null;
          paid_at?: string | null;
          seller_bank?: string | null;
          seller_account?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          order_id?: string | null;
          number?: string;
          issue_date?: string;
          seller_name?: string | null;
          seller_tax_id?: string | null;
          seller_address?: string | null;
          buyer_name?: string | null;
          buyer_tax_id?: string | null;
          buyer_address?: string | null;
          description?: string | null;
          net?: number;
          vat_rate?: number;
          vat_amount?: number;
          gross?: number;
          currency?: string;
          created_at?: string;
          status?: string;
          due_date?: string | null;
          paid_at?: string | null;
          seller_bank?: string | null;
          seller_account?: string | null;
        };
        Relationships: [];
      };
      map_reports: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["report_type"];
          geo: unknown;
          reported_by: string | null;
          confidence: number;
          votes: number;
          comment: string | null;
          created_at: string;
          expires_at: string;
          lat: number | null;
          lng: number | null;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["report_type"];
          geo: unknown;
          reported_by?: string | null;
          confidence?: number;
          votes?: number;
          comment?: string | null;
          created_at?: string;
          expires_at?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["report_type"];
          geo?: unknown;
          reported_by?: string | null;
          confidence?: number;
          votes?: number;
          comment?: string | null;
          created_at?: string;
          expires_at?: string;
          lat?: number | null;
          lng?: number | null;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          company_id: string | null;
          user_id: string;
          role: Database["public"]["Enums"]["role"];
          status: Database["public"]["Enums"]["membership_status"];
          created_at: string;
          modules: string[] | null;
          permissions: Json;
        };
        Insert: {
          id?: string;
          company_id?: string | null;
          user_id: string;
          role: Database["public"]["Enums"]["role"];
          status?: Database["public"]["Enums"]["membership_status"];
          created_at?: string;
          modules?: string[] | null;
          permissions?: Json;
        };
        Update: {
          id?: string;
          company_id?: string | null;
          user_id?: string;
          role?: Database["public"]["Enums"]["role"];
          status?: Database["public"]["Enums"]["membership_status"];
          created_at?: string;
          modules?: string[] | null;
          permissions?: Json;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          company_id: string;
          sender_id: string;
          sender_label: string;
          body: string;
          created_at: string;
          thread_id: string | null;
          photo_path: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          sender_id?: string;
          sender_label?: string;
          body: string;
          created_at?: string;
          thread_id?: string | null;
          photo_path?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          sender_id?: string;
          sender_label?: string;
          body?: string;
          created_at?: string;
          thread_id?: string | null;
          photo_path?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          severity: string;
          dedup_key: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          severity?: string;
          dedup_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          body?: string | null;
          severity?: string;
          dedup_key?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      order_photos: {
        Row: {
          id: string;
          company_id: string;
          order_id: string;
          path: string;
          mime: string | null;
          size_bytes: number | null;
          caption: string | null;
          uploaded_by: string | null;
          created_at: string;
          kind: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          order_id: string;
          path: string;
          mime?: string | null;
          size_bytes?: number | null;
          caption?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          kind?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          order_id?: string;
          path?: string;
          mime?: string | null;
          size_bytes?: number | null;
          caption?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          kind?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          company_id: string;
          reference_no: string | null;
          shipper: string | null;
          consignee: string | null;
          origin: string | null;
          destination: string | null;
          cargo: string | null;
          weight_kg: number | null;
          price: number | null;
          currency: string;
          status: Database["public"]["Enums"]["order_status"];
          vehicle_id: string | null;
          load_date: string | null;
          unload_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          assigned_to: string | null;
          tracking_token: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          reference_no?: string | null;
          shipper?: string | null;
          consignee?: string | null;
          origin?: string | null;
          destination?: string | null;
          cargo?: string | null;
          weight_kg?: number | null;
          price?: number | null;
          currency?: string;
          status?: Database["public"]["Enums"]["order_status"];
          vehicle_id?: string | null;
          load_date?: string | null;
          unload_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          assigned_to?: string | null;
          tracking_token?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          reference_no?: string | null;
          shipper?: string | null;
          consignee?: string | null;
          origin?: string | null;
          destination?: string | null;
          cargo?: string | null;
          weight_kg?: number | null;
          price?: number | null;
          currency?: string;
          status?: Database["public"]["Enums"]["order_status"];
          vehicle_id?: string | null;
          load_date?: string | null;
          unload_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          assigned_to?: string | null;
          tracking_token?: string;
        };
        Relationships: [];
      };
      parking_reviews: {
        Row: {
          id: string;
          user_id: string;
          poi_id: string;
          poi_name: string | null;
          lat: number | null;
          lng: number | null;
          rating: number;
          has_shower: boolean;
          has_wc: boolean;
          has_food: boolean;
          security: boolean;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          poi_id: string;
          poi_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          rating: number;
          has_shower?: boolean;
          has_wc?: boolean;
          has_food?: boolean;
          security?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          poi_id?: string;
          poi_name?: string | null;
          lat?: number | null;
          lng?: number | null;
          rating?: number;
          has_shower?: boolean;
          has_wc?: boolean;
          has_food?: boolean;
          security?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      passkeys: {
        Row: {
          id: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          counter: number;
          transports: string[] | null;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credential_id: string;
          public_key: string;
          counter?: number;
          transports?: string[] | null;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          credential_id?: string;
          public_key?: string;
          counter?: number;
          transports?: string[] | null;
          name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      per_diem_trips: {
        Row: {
          id: string;
          company_id: string;
          driver_name: string | null;
          destination: string | null;
          mode: string;
          hours: number;
          daily_rate: number;
          currency: string;
          trip_date: string | null;
          note: string | null;
          created_by: string | null;
          created_at: string;
          driver_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          driver_name?: string | null;
          destination?: string | null;
          mode: string;
          hours: number;
          daily_rate: number;
          currency?: string;
          trip_date?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_name?: string | null;
          destination?: string | null;
          mode?: string;
          hours?: number;
          daily_rate?: number;
          currency?: string;
          trip_date?: string | null;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Relationships: [];
      };
      poi_reviews: {
        Row: {
          id: string;
          poi_id: string;
          user_id: string;
          rating: number | null;
          safety: number | null;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          poi_id: string;
          user_id: string;
          rating?: number | null;
          safety?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          poi_id?: string;
          user_id?: string;
          rating?: number | null;
          safety?: number | null;
          comment?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      pois: {
        Row: {
          id: string;
          type: Database["public"]["Enums"]["poi_type"];
          name: string | null;
          country: string | null;
          address: string | null;
          geo: unknown;
          amenities: Json | null;
          accepts: Json | null;
          source: string | null;
          rating_avg: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: Database["public"]["Enums"]["poi_type"];
          name?: string | null;
          country?: string | null;
          address?: string | null;
          geo: unknown;
          amenities?: Json | null;
          accepts?: Json | null;
          source?: string | null;
          rating_avg?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: Database["public"]["Enums"]["poi_type"];
          name?: string | null;
          country?: string | null;
          address?: string | null;
          geo?: unknown;
          amenities?: Json | null;
          accepts?: Json | null;
          source?: string | null;
          rating_avg?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          locale: string | null;
          mfa_enabled: boolean;
          created_at: string;
          updated_at: string;
          full_name_enc: string | null;
          phone_enc: string | null;
          email_enc: string | null;
        };
        Insert: {
          id: string;
          locale?: string | null;
          mfa_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          full_name_enc?: string | null;
          phone_enc?: string | null;
          email_enc?: string | null;
        };
        Update: {
          id?: string;
          locale?: string | null;
          mfa_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
          full_name_enc?: string | null;
          phone_enc?: string | null;
          email_enc?: string | null;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          company_id: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_id?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_id?: string | null;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      rates: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string | null;
          rate_per_km: number;
          currency: string;
          valid_from: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id?: string | null;
          rate_per_km: number;
          currency?: string;
          valid_from?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string | null;
          rate_per_km?: number;
          currency?: string;
          valid_from?: string;
        };
        Relationships: [];
      };
      saved_places: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          category: string;
          lat: number;
          lng: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          category?: string;
          lat: number;
          lng: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          category?: string;
          lat?: number;
          lng?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      service_tasks: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          name: string;
          interval_km: number | null;
          interval_months: number | null;
          last_done_km: number | null;
          last_done_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          name: string;
          interval_km?: number | null;
          interval_months?: number | null;
          last_done_km?: number | null;
          last_done_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          name?: string;
          interval_km?: number | null;
          interval_months?: number | null;
          last_done_km?: number | null;
          last_done_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tacho_downloads: {
        Row: {
          id: string;
          company_id: string;
          kind: string;
          driver_id: string | null;
          vehicle_id: string | null;
          last_download: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          kind: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          last_download: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          kind?: string;
          driver_id?: string | null;
          vehicle_id?: string | null;
          last_download?: string;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trip_event_revisions: {
        Row: {
          id: string;
          trip_event_id: string;
          revision: number;
          snapshot: Json;
          edited_by: string | null;
          edited_at: string;
        };
        Insert: {
          id?: string;
          trip_event_id: string;
          revision: number;
          snapshot: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Update: {
          id?: string;
          trip_event_id?: string;
          revision?: number;
          snapshot?: Json;
          edited_by?: string | null;
          edited_at?: string;
        };
        Relationships: [];
      };
      trip_events: {
        Row: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          action: Database["public"]["Enums"]["trip_action"];
          country: string;
          location: string | null;
          geo: unknown | null;
          odometer_km: number;
          weight_kg: number | null;
          amount: number | null;
          comment: string | null;
          device_id: string | null;
          revision: number;
          created_at: string;
          updated_at: string;
          synced_at: string | null;
          order_id: string | null;
          from_vehicle_reg: string | null;
          to_vehicle_reg: string | null;
          postcode: string | null;
          company: string | null;
        };
        Insert: {
          id: string;
          company_id: string;
          driver_id: string;
          vehicle_id: string;
          action: Database["public"]["Enums"]["trip_action"];
          country: string;
          location?: string | null;
          geo?: unknown | null;
          odometer_km: number;
          weight_kg?: number | null;
          amount?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          order_id?: string | null;
          from_vehicle_reg?: string | null;
          to_vehicle_reg?: string | null;
          postcode?: string | null;
          company?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_id?: string;
          vehicle_id?: string;
          action?: Database["public"]["Enums"]["trip_action"];
          country?: string;
          location?: string | null;
          geo?: unknown | null;
          odometer_km?: number;
          weight_kg?: number | null;
          amount?: number | null;
          comment?: string | null;
          device_id?: string | null;
          revision?: number;
          created_at?: string;
          updated_at?: string;
          synced_at?: string | null;
          order_id?: string | null;
          from_vehicle_reg?: string | null;
          to_vehicle_reg?: string | null;
          postcode?: string | null;
          company?: string | null;
        };
        Relationships: [];
      };
      vehicle_costs: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          category: string;
          amount: number;
          currency: string;
          cost_date: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          category: string;
          amount: number;
          currency?: string;
          cost_date?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          category?: string;
          amount?: number;
          currency?: string;
          cost_date?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicle_defects: {
        Row: {
          id: string;
          company_id: string;
          vehicle_id: string;
          reported_by: string | null;
          part: string;
          side: string | null;
          severity: string;
          dashboard_light: boolean;
          description: string;
          status: string;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          vehicle_id: string;
          reported_by?: string | null;
          part: string;
          side?: string | null;
          severity?: string;
          dashboard_light?: boolean;
          description: string;
          status?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          vehicle_id?: string;
          reported_by?: string | null;
          part?: string;
          side?: string | null;
          severity?: string;
          dashboard_light?: boolean;
          description?: string;
          status?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          company_id: string;
          registration: string;
          model: string;
          year: number | null;
          first_registration_date: string | null;
          inspection_expiry: string | null;
          insurance_expiry: string | null;
          leasing_end: string | null;
          curb_weight_kg: number | null;
          max_payload_kg: number | null;
          height_cm: number | null;
          width_cm: number | null;
          length_cm: number | null;
          vehicle_type: Database["public"]["Enums"]["vehicle_type"];
          forwarder: string | null;
          comment: string | null;
          created_at: string;
          updated_at: string;
          make: string | null;
          vin: string | null;
          insurer: string | null;
          license_number: string | null;
          fuel_tank_l: number | null;
          adblue_tank_l: number | null;
          trailer_registration: string | null;
          trailer_type: string | null;
          license_expiry: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          registration: string;
          model: string;
          year?: number | null;
          first_registration_date?: string | null;
          inspection_expiry?: string | null;
          insurance_expiry?: string | null;
          leasing_end?: string | null;
          curb_weight_kg?: number | null;
          max_payload_kg?: number | null;
          height_cm?: number | null;
          width_cm?: number | null;
          length_cm?: number | null;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
          forwarder?: string | null;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
          make?: string | null;
          vin?: string | null;
          insurer?: string | null;
          license_number?: string | null;
          fuel_tank_l?: number | null;
          adblue_tank_l?: number | null;
          trailer_registration?: string | null;
          trailer_type?: string | null;
          license_expiry?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          registration?: string;
          model?: string;
          year?: number | null;
          first_registration_date?: string | null;
          inspection_expiry?: string | null;
          insurance_expiry?: string | null;
          leasing_end?: string | null;
          curb_weight_kg?: number | null;
          max_payload_kg?: number | null;
          height_cm?: number | null;
          width_cm?: number | null;
          length_cm?: number | null;
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"];
          forwarder?: string | null;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
          make?: string | null;
          vin?: string | null;
          insurer?: string | null;
          license_number?: string | null;
          fuel_tank_l?: number | null;
          adblue_tank_l?: number | null;
          trailer_registration?: string | null;
          trailer_type?: string | null;
          license_expiry?: string | null;
        };
        Relationships: [];
      };
      work_time_entries: {
        Row: {
          id: string;
          company_id: string;
          driver_name: string | null;
          work_date: string;
          driving: number;
          other_work: number;
          rest: number;
          note: string | null;
          created_by: string | null;
          created_at: string;
          driver_id: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          driver_name?: string | null;
          work_date: string;
          driving?: number;
          other_work?: number;
          rest?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          driver_name?: string | null;
          work_date?: string;
          driving?: number;
          other_work?: number;
          rest?: number;
          note?: string | null;
          created_by?: string | null;
          created_at?: string;
          driver_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      _card_key: { Args: Record<PropertyKey, never>; Returns: string };
      _pii_key: { Args: Record<PropertyKey, never>; Returns: string };
      accept_invite: { Args: { p_token: string | null }; Returns: string };
      bootstrap_company: { Args: { p_name: string | null }; Returns: string };
      company_members: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          email: string;
          role: Database["public"]["Enums"]["role"];
          modules: string[];
          permissions: Json;
          status: string;
        }[];
      };
      company_wipe_data: {
        Args: { p_company: string | null; p_confirm_name: string | null };
        Returns: Json;
      };
      create_blank_invoice: {
        Args: {
          p_company: string | null;
          p_buyer_name: string | null;
          p_buyer_tax_id?: string | null;
          p_buyer_address?: string | null;
          p_currency?: string | null;
        };
        Returns: Json;
      };
      create_invite: {
        Args: {
          p_role?: Database["public"]["Enums"]["role"] | null;
          p_vehicle?: string | null;
          p_email?: string | null;
          p_permissions?: Json | null;
        };
        Returns: string;
      };
      create_invoice: {
        Args: { p_order: string | null; p_vat_rate?: number | null };
        Returns: Json;
      };
      dev_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      driver_documents: { Args: { p_driver: string | null }; Returns: Json };
      driver_link_user: {
        Args: { p_driver: string | null; p_company: string | null; p_user: string | null };
        Returns: undefined;
      };
      driver_save: {
        Args: {
          p_id: string | null;
          p_company: string | null;
          p_first: string | null;
          p_last: string | null;
          p_birth: string | null;
          p_categories: string[] | null;
          p_quals: string[] | null;
          p_notes: string | null;
          p_license_expiry?: string | null;
          p_code95_expiry?: string | null;
          p_medical_expiry?: string | null;
          p_adr_expiry?: string | null;
          p_psychotech_expiry?: string | null;
          p_passport_expiry?: string | null;
          p_id_card_expiry?: string | null;
          p_qual_details?: Json | null;
          p_company_name?: string | null;
          p_company_tax_id?: string | null;
          p_company_regon?: string | null;
          p_company_address?: string | null;
          p_company_activity?: string | null;
        };
        Returns: string;
      };
      driver_set_documents: {
        Args: {
          p_driver: string | null;
          p_id_card: string | null;
          p_passport: string | null;
          p_license: string | null;
        };
        Returns: undefined;
      };
      duplicate_invoice: { Args: { p_invoice: string | null }; Returns: Json };
      fuel_card_pin: { Args: { p_card: string | null }; Returns: string };
      fuel_card_set_pin: {
        Args: { p_card: string | null; p_pin: string | null };
        Returns: undefined;
      };
      generate_expiry_notifications: { Args: { p_company: string | null }; Returns: undefined };
      has_role: {
        Args: { p_company: string | null; p_roles: Database["public"]["Enums"]["role"][] | null };
        Returns: boolean;
      };
      is_assigned_to_vehicle: { Args: { p_vehicle: string | null }; Returns: boolean };
      is_developer: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_member_of: { Args: { p_company: string | null }; Returns: boolean };
      is_thread_member: { Args: { p_thread: string | null }; Returns: boolean };
      list_drivers: { Args: { p_company: string | null }; Returns: Json };
      list_fuel_cards_for_user: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          provider: Database["public"]["Enums"]["fuel_card_provider"];
          card_number_masked: string;
          valid_until: string;
          discount_percent: number;
          vehicle_id: string;
          registration: string;
        }[];
      };
      list_invites: { Args: { p_company: string | null }; Returns: Json };
      list_visible_checklist_templates: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          items: Json;
          active: boolean;
          assigned_drivers: string[];
        }[];
      };
      my_driver_identity: { Args: Record<PropertyKey, never>; Returns: Json };
      notify_company: {
        Args: {
          p_company: string | null;
          p_type: string | null;
          p_title: string | null;
          p_body: string | null;
          p_severity: string | null;
        };
        Returns: undefined;
      };
      order_set_status: {
        Args: {
          p_order: string | null;
          p_status: Database["public"]["Enums"]["order_status"] | null;
        };
        Returns: undefined;
      };
      order_tracking: {
        Args: { p_token: string | null };
        Returns: {
          reference_no: string;
          origin: string;
          destination: string;
          status: Database["public"]["Enums"]["order_status"];
          load_date: string;
          unload_date: string;
          updated_at: string;
          truck_lat: number;
          truck_lng: number;
          truck_updated_at: string;
        }[];
      };
      send_driver_route: {
        Args: {
          p_company: string | null;
          p_driver: string | null;
          p_name: string | null;
          p_stops: Json | null;
          p_geometry: Json | null;
          p_summary: Json | null;
        };
        Returns: string;
      };
      thread_company: { Args: { p_thread: string | null }; Returns: string };
    };
    Enums: {
      fuel_card_provider:
        | "dkv"
        | "eurowag"
        | "shell"
        | "bp"
        | "circlek"
        | "e100"
        | "uta"
        | "as24"
        | "aral"
        | "omv"
        | "routex"
        | "logpay"
        | "esso"
        | "totalenergies"
        | "other"
        | "tankpool24"
        | "morganfuels"
        | "iqcard";
      membership_status: "active" | "invited" | "disabled";
      order_status: "new" | "assigned" | "in_progress" | "delivered" | "invoiced" | "cancelled";
      payment_method: "card" | "cash";
      poi_type: "parking" | "fuel_station" | "ferry" | "airport" | "company" | "wash" | "weigh";
      report_type: "accident" | "police" | "closure" | "traffic" | "weigh" | "hazard";
      role: "developer" | "owner" | "dispatcher" | "driver";
      trip_action: "load" | "unload" | "start" | "end" | "service" | "other" | "transshipment";
      vehicle_type: "truck" | "tractor" | "van" | "trailer" | "other";
    };
    CompositeTypes: { [_ in never]: never };
  };
}
