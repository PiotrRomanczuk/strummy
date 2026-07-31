// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Single source of truth for database types. Regenerate with:
//   npm run db:types
//
// Four hand-maintained copies of these types used to exist. They drifted from
// the schema and from each other, declaring columns the database did not have
// (`sign_in_count`, `last_sign_in_at`, `deletion_scheduled_for`, `lead_source`,
// ...). Because `tsc` trusted them, selecting one of those columns compiled
// cleanly and then failed at runtime with Postgres 42703 — which rejects the
// ENTIRE query, so one dead column broke a whole feature. That pattern caused
// at least seven production bugs before this file was introduced.
//
// types/database.types.ts is a thin re-export of this file, kept because 23
// modules still import through it. The other two shims introduced alongside it
// (types/database.types.generated.ts, types/supabase.ts) had no importers left
// once those call sites were repointed, and were removed.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_execution_logs: {
        Row: {
          agent_id: string
          created_at: string
          error_code: string | null
          execution_time: number
          id: string
          input_hash: string
          request_id: string
          successful: boolean
          timestamp: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          error_code?: string | null
          execution_time: number
          id?: string
          input_hash: string
          request_id: string
          successful: boolean
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          error_code?: string | null
          execution_time?: number
          id?: string
          input_hash?: string
          request_id?: string
          successful?: boolean
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agent_execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          context_id: string | null
          context_type: Database["public"]["Enums"]["ai_context_type"]
          created_at: string
          id: string
          is_archived: boolean
          model_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: Database["public"]["Enums"]["ai_context_type"]
          created_at?: string
          id?: string
          is_archived?: boolean
          model_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: Database["public"]["Enums"]["ai_context_type"]
          created_at?: string
          id?: string
          is_archived?: boolean
          model_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          agent_id: string | null
          context_entity_id: string | null
          context_entity_type: string | null
          created_at: string
          error_message: string | null
          generation_type: Database["public"]["Enums"]["ai_generation_type"]
          id: string
          input_params: Json
          is_starred: boolean
          is_successful: boolean
          model_id: string | null
          output_content: string
          provider: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          context_entity_id?: string | null
          context_entity_type?: string | null
          created_at?: string
          error_message?: string | null
          generation_type: Database["public"]["Enums"]["ai_generation_type"]
          id?: string
          input_params: Json
          is_starred?: boolean
          is_successful?: boolean
          model_id?: string | null
          output_content: string
          provider?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          context_entity_id?: string | null
          context_entity_type?: string | null
          created_at?: string
          error_message?: string | null
          generation_type?: Database["public"]["Enums"]["ai_generation_type"]
          id?: string
          input_params?: Json
          is_starred?: boolean
          is_successful?: boolean
          model_id?: string | null
          output_content?: string
          provider?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_generations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_helpful: boolean | null
          latency_ms: number | null
          model_id: string | null
          role: Database["public"]["Enums"]["ai_message_role"]
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_helpful?: boolean | null
          latency_ms?: number | null
          model_id?: string | null
          role: Database["public"]["Enums"]["ai_message_role"]
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_helpful?: boolean | null
          latency_ms?: number | null
          model_id?: string | null
          role?: Database["public"]["Enums"]["ai_message_role"]
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_templates: {
        Row: {
          category: Database["public"]["Enums"]["ai_prompt_category"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          prompt_template: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["ai_prompt_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          prompt_template: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: Database["public"]["Enums"]["ai_prompt_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          prompt_template?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_prompt_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      ai_usage_stats: {
        Row: {
          created_at: string
          date: string
          error_count: number
          id: string
          model_id: string
          request_count: number
          total_latency_ms: number
          total_tokens: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          error_count?: number
          id?: string
          model_id: string
          request_count?: number
          total_latency_ms?: number
          total_tokens?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          error_count?: number
          id?: string
          model_id?: string
          request_count?: number
          total_latency_ms?: number
          total_tokens?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_usage_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          last_used_at: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          last_used_at?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          last_used_at?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      apple_shortcut_song_import_log: {
        Row: {
          created_at: string
          error_message: string | null
          http_status: number | null
          id: string
          song_artist: string | null
          song_id: string | null
          song_title: string | null
          source: string
          spotify_track_id: string | null
          spotify_url: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          song_artist?: string | null
          song_id?: string | null
          song_title?: string | null
          source?: string
          spotify_track_id?: string | null
          spotify_url?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          http_status?: number | null
          id?: string
          song_artist?: string | null
          song_id?: string | null
          song_title?: string | null
          source?: string
          spotify_track_id?: string | null
          spotify_url?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apple_shortcut_song_import_log_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "apple_shortcut_song_import_log_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "apple_shortcut_song_import_log_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "apple_shortcut_song_import_log_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apple_shortcut_song_import_log_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
        ]
      }
      assignment_history: {
        Row: {
          assignment_id: string
          change_type: string
          changed_at: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json
          notes: string | null
          previous_data: Json | null
        }
        Insert: {
          assignment_id: string
          change_type: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data: Json
          notes?: string | null
          previous_data?: Json | null
        }
        Update: {
          assignment_id?: string
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json
          notes?: string | null
          previous_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "v_assignment_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_templates: {
        Row: {
          checklist: Json
          created_at: string
          description: string | null
          id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          description?: string | null
          id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_templates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_templates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignment_templates_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      assignments: {
        Row: {
          checklist: Json
          chord_drill: Json | null
          chord_drill_result: Json | null
          created_at: string
          daily_target_minutes: number | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          lesson_id: string | null
          song_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          submission_type: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          chord_drill?: Json | null
          chord_drill_result?: Json | null
          created_at?: string
          daily_target_minutes?: number | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lesson_id?: string | null
          song_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          submission_type?: string
          teacher_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          chord_drill?: Json | null
          chord_drill_result?: Json | null
          created_at?: string
          daily_target_minutes?: number | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          lesson_id?: string | null
          song_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
          student_id?: string
          submission_type?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      audit_log_2026_01: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_02: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_03: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_04: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_05: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_06: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_07: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_08: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_09: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_10: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_11: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_2026_12: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      audit_log_default: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id: string
          metadata: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes: Json
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["audit_entity"]
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      auth_events: {
        Row: {
          actor_id: string | null
          email_error: string | null
          email_status: Database["public"]["Enums"]["auth_email_status"]
          error_message: string | null
          event_type: Database["public"]["Enums"]["auth_event_type"]
          id: string
          ip_address: string | null
          metadata: Json | null
          occurred_at: string
          success: boolean
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          actor_id?: string | null
          email_error?: string | null
          email_status?: Database["public"]["Enums"]["auth_email_status"]
          error_message?: string | null
          event_type: Database["public"]["Enums"]["auth_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          success: boolean
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          actor_id?: string | null
          email_error?: string | null
          email_status?: Database["public"]["Enums"]["auth_email_status"]
          error_message?: string | null
          event_type?: Database["public"]["Enums"]["auth_event_type"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          occurred_at?: string
          success?: boolean
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempted_at: string
          id: string
          identifier: string
          operation: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          identifier: string
          operation: string
        }
        Update: {
          attempted_at?: string
          id?: string
          identifier?: string
          operation?: string
        }
        Relationships: []
      }
      chord_quiz_attempts: {
        Row: {
          chord_id: string
          created_at: string
          id: string
          is_correct: boolean
          response_time_ms: number | null
          selected_answer: string
          student_id: string
        }
        Insert: {
          chord_id: string
          created_at?: string
          id?: string
          is_correct: boolean
          response_time_ms?: number | null
          selected_answer: string
          student_id: string
        }
        Update: {
          chord_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          response_time_ms?: number | null
          selected_answer?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chord_quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chord_quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chord_quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      chord_srs: {
        Row: {
          chord_id: string
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          next_review_at: string
          repetitions: number
          student_id: string
          updated_at: string
        }
        Insert: {
          chord_id: string
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number
          student_id: string
          updated_at?: string
        }
        Update: {
          chord_id?: string
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          next_review_at?: string
          repetitions?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chord_srs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chord_srs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chord_srs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      content_post_metrics: {
        Row: {
          captured_at: string
          comments_count: number
          created_at: string
          id: string
          likes_count: number
          notes: string | null
          post_id: string
          saves_count: number
          shares_count: number
          views_count: number
        }
        Insert: {
          captured_at?: string
          comments_count?: number
          created_at?: string
          id?: string
          likes_count?: number
          notes?: string | null
          post_id: string
          saves_count?: number
          shares_count?: number
          views_count?: number
        }
        Update: {
          captured_at?: string
          comments_count?: number
          created_at?: string
          id?: string
          likes_count?: number
          notes?: string | null
          post_id?: string
          saves_count?: number
          shares_count?: number
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "content_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_posts: {
        Row: {
          caption: string | null
          comments_count: number
          created_at: string
          engagement_rate: number | null
          external_post_id: string | null
          external_url: string | null
          extra_hashtags: string[]
          hashtag_set_ids: string[]
          hook: string | null
          id: string
          likes_count: number
          metrics_updated_at: string | null
          notes: string | null
          platform: string
          published_at: string | null
          saves_count: number
          scheduled_at: string | null
          shares_count: number
          song_id: string
          song_video_id: string | null
          status: string
          stories: Json
          updated_at: string
          views_count: number
        }
        Insert: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          engagement_rate?: number | null
          external_post_id?: string | null
          external_url?: string | null
          extra_hashtags?: string[]
          hashtag_set_ids?: string[]
          hook?: string | null
          id?: string
          likes_count?: number
          metrics_updated_at?: string | null
          notes?: string | null
          platform: string
          published_at?: string | null
          saves_count?: number
          scheduled_at?: string | null
          shares_count?: number
          song_id: string
          song_video_id?: string | null
          status?: string
          stories?: Json
          updated_at?: string
          views_count?: number
        }
        Update: {
          caption?: string | null
          comments_count?: number
          created_at?: string
          engagement_rate?: number | null
          external_post_id?: string | null
          external_url?: string | null
          extra_hashtags?: string[]
          hashtag_set_ids?: string[]
          hook?: string | null
          id?: string
          likes_count?: number
          metrics_updated_at?: string | null
          notes?: string | null
          platform?: string
          published_at?: string | null
          saves_count?: number
          scheduled_at?: string | null
          shares_count?: number
          song_id?: string
          song_video_id?: string | null
          status?: string
          stories?: Json
          updated_at?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "content_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "content_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "content_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_posts_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "content_posts_song_video_id_fkey"
            columns: ["song_video_id"]
            isOneToOne: false
            referencedRelation: "song_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_files: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          display_order: number
          entity_id: string
          entity_type: string
          file_size_bytes: number | null
          file_type: string
          filename: string
          google_drive_file_id: string
          google_drive_folder_id: string | null
          id: string
          metadata: Json | null
          mime_type: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          entity_id: string
          entity_type: string
          file_size_bytes?: number | null
          file_type: string
          filename: string
          google_drive_file_id: string
          google_drive_folder_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          entity_id?: string
          entity_type?: string
          file_size_bytes?: number | null
          file_type?: string
          filename?: string
          google_drive_file_id?: string
          google_drive_folder_id?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: []
      }
      hashtag_sets: {
        Row: {
          created_at: string
          description: string | null
          hashtags: string[]
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hashtags?: string[]
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      in_app_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          icon: string | null
          id: string
          is_read: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: number
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority?: number
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          icon?: string | null
          id?: string
          is_read?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          priority?: number
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "in_app_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      lesson_songs: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          notes: string | null
          repertoire_id: string | null
          song_id: string
          status: Database["public"]["Enums"]["lesson_song_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          notes?: string | null
          repertoire_id?: string | null
          song_id: string
          status?: Database["public"]["Enums"]["lesson_song_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          notes?: string | null
          repertoire_id?: string | null
          song_id?: string
          status?: Database["public"]["Enums"]["lesson_song_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_songs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_songs_repertoire_id_fkey"
            columns: ["repertoire_id"]
            isOneToOne: false
            referencedRelation: "student_repertoire"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "lesson_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "lesson_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "lesson_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_songs_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_minutes: number | null
          format: string | null
          google_event_id: string | null
          id: string
          lesson_teacher_number: number | null
          notes: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["lesson_status"]
          student_id: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          format?: string | null
          google_event_id?: string | null
          id?: string
          lesson_teacher_number?: number | null
          notes?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["lesson_status"]
          student_id: string
          teacher_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          format?: string | null
          google_event_id?: string | null
          id?: string
          lesson_teacher_number?: number | null
          notes?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          student_id?: string
          teacher_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      notification_log: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          max_retries: number
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient_email: string
          recipient_user_id: string
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string
          template_data: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          notification_type: Database["public"]["Enums"]["notification_type"]
          recipient_email: string
          recipient_user_id: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject: string
          template_data?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number
          notification_type?: Database["public"]["Enums"]["notification_type"]
          recipient_email?: string
          recipient_user_id?: string
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string
          template_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          delivery_channel: Database["public"]["Enums"]["notification_delivery_channel"]
          enabled: boolean
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_channel?: Database["public"]["Enums"]["notification_delivery_channel"]
          enabled?: boolean
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_channel?: Database["public"]["Enums"]["notification_delivery_channel"]
          enabled?: boolean
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: number
          processed_at: string | null
          recipient_user_id: string
          scheduled_for: string
          status: Database["public"]["Enums"]["notification_status"]
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority?: number
          processed_at?: string | null
          recipient_user_id: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          priority?: number
          processed_at?: string | null
          recipient_user_id?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["notification_status"]
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_queue_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          bpm_practiced: number | null
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          song_id: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          bpm_practiced?: number | null
          created_at?: string
          duration_minutes: number
          id?: string
          notes?: string | null
          song_id?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          bpm_practiced?: number | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          song_id?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string | null
          avatar_url: string | null
          billing_cycle: string | null
          created_at: string
          deleted_at: string | null
          deletion_requested_at: string | null
          email: string | null
          failed_login_attempts: number | null
          first_name: string | null
          full_name: string | null
          id: string
          instrument: string | null
          invite_email: string | null
          is_active: boolean
          is_admin: boolean
          is_development: boolean
          is_parent: boolean
          is_shadow: boolean
          is_student: boolean
          is_teacher: boolean
          last_name: string | null
          lesson_day_of_week: number | null
          lesson_duration_minutes: number | null
          lesson_rate: number | null
          lesson_time_local: string | null
          locale: string
          locked_until: string | null
          notes: string | null
          onboarding_completed: boolean
          parent_email: string | null
          parent_id: string | null
          parent_name: string | null
          phone: string | null
          skill_level: string | null
          start_date: string | null
          status_changed_at: string | null
          student_status: Database["public"]["Enums"]["student_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_color?: string | null
          avatar_url?: string | null
          billing_cycle?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          email?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          instrument?: string | null
          invite_email?: string | null
          is_active?: boolean
          is_admin?: boolean
          is_development?: boolean
          is_parent?: boolean
          is_shadow?: boolean
          is_student?: boolean
          is_teacher?: boolean
          last_name?: string | null
          lesson_day_of_week?: number | null
          lesson_duration_minutes?: number | null
          lesson_rate?: number | null
          lesson_time_local?: string | null
          locale?: string
          locked_until?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          phone?: string | null
          skill_level?: string | null
          start_date?: string | null
          status_changed_at?: string | null
          student_status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_color?: string | null
          avatar_url?: string | null
          billing_cycle?: string | null
          created_at?: string
          deleted_at?: string | null
          deletion_requested_at?: string | null
          email?: string | null
          failed_login_attempts?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          instrument?: string | null
          invite_email?: string | null
          is_active?: boolean
          is_admin?: boolean
          is_development?: boolean
          is_parent?: boolean
          is_shadow?: boolean
          is_student?: boolean
          is_teacher?: boolean
          last_name?: string | null
          lesson_day_of_week?: number | null
          lesson_duration_minutes?: number | null
          lesson_rate?: number | null
          lesson_time_local?: string | null
          locale?: string
          locked_until?: string | null
          notes?: string | null
          onboarding_completed?: boolean
          parent_email?: string | null
          parent_id?: string | null
          parent_name?: string | null
          phone?: string | null
          skill_level?: string | null
          start_date?: string | null
          status_changed_at?: string | null
          student_status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      song_of_the_week: {
        Row: {
          active_from: string
          active_until: string | null
          category: string
          created_at: string
          id: string
          is_active: boolean
          selected_by: string | null
          song_id: string
          teacher_message: string | null
          updated_at: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          selected_by?: string | null
          song_id: string
          teacher_message?: string | null
          updated_at?: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          selected_by?: string | null
          song_id?: string
          teacher_message?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_of_the_week_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_of_the_week_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "song_of_the_week_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "song_of_the_week_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_of_the_week_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_of_the_week_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_of_the_week_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_of_the_week_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
        ]
      }
      song_requests: {
        Row: {
          artist: string | null
          created_at: string
          id: string
          notes: string | null
          review_notes: string | null
          reviewed_by: string | null
          song_id: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          song_id?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          song_id?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "song_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "song_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_requests_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "song_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      song_status_history: {
        Row: {
          changed_at: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          song_id: string
          student_id: string
        }
        Insert: {
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          song_id: string
          student_id: string
        }
        Update: {
          changed_at?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          song_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "song_status_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_status_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_status_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_status_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_status_history_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_status_history_student_id_profiles_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_status_history_student_id_profiles_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "song_status_history_student_id_profiles_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      song_videos: {
        Row: {
          created_at: string
          display_order: number
          duration_seconds: number | null
          file_size_bytes: number | null
          filename: string
          google_drive_file_id: string
          google_drive_folder_id: string | null
          id: string
          instagram_media_id: string | null
          is_audio_mixed: boolean
          is_recording_correct: boolean
          is_video_edited: boolean
          is_well_lit: boolean
          match_confidence: number | null
          match_source: string | null
          mic_type: string | null
          mime_type: string
          production_status: string
          published_to_instagram: boolean
          published_to_tiktok: boolean
          published_to_youtube_shorts: boolean
          song_id: string | null
          thumbnail_url: string | null
          tiktok_media_id: string | null
          title: string
          updated_at: string
          uploaded_by: string
          video_type: Database["public"]["Enums"]["video_type"]
          youtube_shorts_id: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename: string
          google_drive_file_id: string
          google_drive_folder_id?: string | null
          id?: string
          instagram_media_id?: string | null
          is_audio_mixed?: boolean
          is_recording_correct?: boolean
          is_video_edited?: boolean
          is_well_lit?: boolean
          match_confidence?: number | null
          match_source?: string | null
          mic_type?: string | null
          mime_type: string
          production_status?: string
          published_to_instagram?: boolean
          published_to_tiktok?: boolean
          published_to_youtube_shorts?: boolean
          song_id?: string | null
          thumbnail_url?: string | null
          tiktok_media_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by: string
          video_type?: Database["public"]["Enums"]["video_type"]
          youtube_shorts_id?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          duration_seconds?: number | null
          file_size_bytes?: number | null
          filename?: string
          google_drive_file_id?: string
          google_drive_folder_id?: string | null
          id?: string
          instagram_media_id?: string | null
          is_audio_mixed?: boolean
          is_recording_correct?: boolean
          is_video_edited?: boolean
          is_well_lit?: boolean
          match_confidence?: number | null
          match_source?: string | null
          mic_type?: string | null
          mime_type?: string
          production_status?: string
          published_to_instagram?: boolean
          published_to_tiktok?: boolean
          published_to_youtube_shorts?: boolean
          song_id?: string | null
          thumbnail_url?: string | null
          tiktok_media_id?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          video_type?: Database["public"]["Enums"]["video_type"]
          youtube_shorts_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "song_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "song_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "song_videos_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
        ]
      }
      songs: {
        Row: {
          audio_files: Json | null
          author: string | null
          capo_fret: number | null
          category: string | null
          chords: string | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          duration_ms: number | null
          gallery_images: string[] | null
          id: string
          is_draft: boolean
          key: Database["public"]["Enums"]["music_key"] | null
          level: Database["public"]["Enums"]["difficulty_level"] | null
          lyrics_with_chords: string | null
          notes: string | null
          priority_bucket: string | null
          recorded_at: string | null
          recording_queued_at: string | null
          release_year: number | null
          search_vector: unknown
          short_title: string | null
          spotify_link_url: string | null
          strumming_pattern: string | null
          tempo: number | null
          tiktok_short_url: string | null
          time_signature: number | null
          title: string
          ultimate_guitar_link: string | null
          updated_at: string
          youtube_url: string | null
        }
        Insert: {
          audio_files?: Json | null
          author?: string | null
          capo_fret?: number | null
          category?: string | null
          chords?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          gallery_images?: string[] | null
          id?: string
          is_draft?: boolean
          key?: Database["public"]["Enums"]["music_key"] | null
          level?: Database["public"]["Enums"]["difficulty_level"] | null
          lyrics_with_chords?: string | null
          notes?: string | null
          priority_bucket?: string | null
          recorded_at?: string | null
          recording_queued_at?: string | null
          release_year?: number | null
          search_vector?: unknown
          short_title?: string | null
          spotify_link_url?: string | null
          strumming_pattern?: string | null
          tempo?: number | null
          tiktok_short_url?: string | null
          time_signature?: number | null
          title: string
          ultimate_guitar_link?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Update: {
          audio_files?: Json | null
          author?: string | null
          capo_fret?: number | null
          category?: string | null
          chords?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          duration_ms?: number | null
          gallery_images?: string[] | null
          id?: string
          is_draft?: boolean
          key?: Database["public"]["Enums"]["music_key"] | null
          level?: Database["public"]["Enums"]["difficulty_level"] | null
          lyrics_with_chords?: string | null
          notes?: string | null
          priority_bucket?: string | null
          recorded_at?: string | null
          recording_queued_at?: string | null
          release_year?: number | null
          search_vector?: unknown
          short_title?: string | null
          spotify_link_url?: string | null
          strumming_pattern?: string | null
          tempo?: number | null
          tiktok_short_url?: string | null
          time_signature?: number | null
          title?: string
          ultimate_guitar_link?: string | null
          updated_at?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      spotify_matches: {
        Row: {
          ai_reasoning: string | null
          album_name: string | null
          artist_name: string
          confidence_score: number
          cover_image_url: string | null
          created_at: string
          duration_ms: number | null
          id: string
          match_reason: string | null
          popularity: number | null
          preview_url: string | null
          release_date: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          search_query: string
          song_id: string
          status: Database["public"]["Enums"]["spotify_match_status"]
          track_id: string
          track_name: string
          updated_at: string
          url: string
        }
        Insert: {
          ai_reasoning?: string | null
          album_name?: string | null
          artist_name: string
          confidence_score: number
          cover_image_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          match_reason?: string | null
          popularity?: number | null
          preview_url?: string | null
          release_date?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_query: string
          song_id: string
          status?: Database["public"]["Enums"]["spotify_match_status"]
          track_id: string
          track_name: string
          updated_at?: string
          url: string
        }
        Update: {
          ai_reasoning?: string | null
          album_name?: string | null
          artist_name?: string
          confidence_score?: number
          cover_image_url?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          match_reason?: string | null
          popularity?: number | null
          preview_url?: string | null
          release_date?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          search_query?: string
          song_id?: string
          status?: Database["public"]["Enums"]["spotify_match_status"]
          track_id?: string
          track_name?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotify_matches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spotify_matches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "spotify_matches_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "spotify_matches_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "spotify_matches_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "spotify_matches_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "spotify_matches_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spotify_matches_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
        ]
      }
      student_repertoire: {
        Row: {
          added_by_student: boolean
          assigned_by: string | null
          capo_fret: number | null
          created_at: string
          current_status: Database["public"]["Enums"]["song_progress_status"]
          custom_strumming: string | null
          difficulty_rating: number | null
          id: string
          is_active: boolean | null
          last_practiced_at: string | null
          mastered_at: string | null
          practice_session_count: number | null
          preferred_key: Database["public"]["Enums"]["music_key"] | null
          priority: string | null
          self_rating: number | null
          self_rating_updated_at: string | null
          song_id: string
          sort_order: number | null
          started_at: string | null
          student_id: string
          student_notes: string | null
          teacher_notes: string | null
          total_practice_minutes: number | null
          updated_at: string
        }
        Insert: {
          added_by_student?: boolean
          assigned_by?: string | null
          capo_fret?: number | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["song_progress_status"]
          custom_strumming?: string | null
          difficulty_rating?: number | null
          id?: string
          is_active?: boolean | null
          last_practiced_at?: string | null
          mastered_at?: string | null
          practice_session_count?: number | null
          preferred_key?: Database["public"]["Enums"]["music_key"] | null
          priority?: string | null
          self_rating?: number | null
          self_rating_updated_at?: string | null
          song_id: string
          sort_order?: number | null
          started_at?: string | null
          student_id: string
          student_notes?: string | null
          teacher_notes?: string | null
          total_practice_minutes?: number | null
          updated_at?: string
        }
        Update: {
          added_by_student?: boolean
          assigned_by?: string | null
          capo_fret?: number | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["song_progress_status"]
          custom_strumming?: string | null
          difficulty_rating?: number | null
          id?: string
          is_active?: boolean | null
          last_practiced_at?: string | null
          mastered_at?: string | null
          practice_session_count?: number | null
          preferred_key?: Database["public"]["Enums"]["music_key"] | null
          priority?: string | null
          self_rating?: number | null
          self_rating_updated_at?: string | null
          song_id?: string
          sort_order?: number | null
          started_at?: string | null
          student_id?: string
          student_notes?: string | null
          teacher_notes?: string | null
          total_practice_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_repertoire_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_repertoire_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_repertoire_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "student_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_engagement"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "student_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "mv_song_popularity"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "student_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "student_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "songs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_repertoire_song_id_fkey"
            columns: ["song_id"]
            isOneToOne: false
            referencedRelation: "v_song_usage_stats"
            referencedColumns: ["song_id"]
          },
          {
            foreignKeyName: "student_repertoire_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_repertoire_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_repertoire_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      student_skills: {
        Row: {
          created_at: string | null
          id: string
          last_assessed_at: string | null
          notes: string | null
          skill_id: string
          status: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_assessed_at?: string | null
          notes?: string | null
          skill_id: string
          status: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_assessed_at?: string | null
          notes?: string | null
          skill_id?: string
          status?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          conflict_data: Json
          created_at: string
          google_event_id: string
          id: string
          lesson_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          conflict_data: Json
          created_at?: string
          google_event_id: string
          id?: string
          lesson_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          conflict_data?: Json
          created_at?: string
          google_event_id?: string
          id?: string
          lesson_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string
          error: Json | null
          id: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          occurred_at: string
          prefix: string
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error?: Json | null
          id?: string
          level: Database["public"]["Enums"]["log_level"]
          message: string
          occurred_at?: string
          prefix: string
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string
          error?: Json | null
          id?: string
          level?: Database["public"]["Enums"]["log_level"]
          message?: string
          occurred_at?: string
          prefix?: string
          request_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "system_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      task_management: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_management_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      teacher_settings: {
        Row: {
          city: string | null
          created_at: string
          default_lesson_minutes: number | null
          display_name: string | null
          id: string
          instrument: string | null
          profile_id: string
          studio_name: string | null
          tagline: string | null
          teaches: string[]
          timezone: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          default_lesson_minutes?: number | null
          display_name?: string | null
          id?: string
          instrument?: string | null
          profile_id: string
          studio_name?: string | null
          tagline?: string | null
          teaches?: string[]
          timezone?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          city?: string | null
          created_at?: string
          default_lesson_minutes?: number | null
          display_name?: string | null
          id?: string
          instrument?: string | null
          profile_id?: string
          studio_name?: string | null
          tagline?: string | null
          teaches?: string[]
          timezone?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "teacher_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      theoretical_course_access: {
        Row: {
          course_id: string
          granted_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          granted_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theoretical_course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "theoretical_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theoretical_course_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theoretical_course_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "theoretical_course_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "theoretical_course_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theoretical_course_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "theoretical_course_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      theoretical_courses: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_published: boolean
          level: Database["public"]["Enums"]["theoretical_course_level"]
          published_at: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          level?: Database["public"]["Enums"]["theoretical_course_level"]
          published_at?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          level?: Database["public"]["Enums"]["theoretical_course_level"]
          published_at?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theoretical_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "theoretical_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "theoretical_courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      theoretical_lessons: {
        Row: {
          content: string
          course_id: string
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          id: string
          is_published: boolean
          published_at: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theoretical_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "theoretical_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          notes: string | null
          previous_data: Json | null
          user_id: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          notes?: string | null
          previous_data?: Json | null
          user_id: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          notes?: string | null
          previous_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "user_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: number | null
          provider: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: number | null
          provider: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: number | null
          provider?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          daily_goal_minutes: number | null
          goals: string[]
          id: string
          instrument_preference: string[]
          learning_style: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_goal_minutes?: number | null
          goals?: string[]
          id?: string
          instrument_preference?: string[]
          learning_style?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_goal_minutes?: number | null
          goals?: string[]
          id?: string
          instrument_preference?: string[]
          learning_style?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          channel_id: string
          created_at: string
          expiration: number
          id: string
          provider: string
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          expiration: number
          id?: string
          provider: string
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          expiration?: number
          id?: string
          provider?: string
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      lesson_counts_per_student: {
        Row: {
          student_id: string | null
          total_lessons: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      lesson_counts_per_teacher: {
        Row: {
          teacher_id: string | null
          total_lessons: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      mv_song_engagement: {
        Row: {
          active_learners: number | null
          author: string | null
          avg_difficulty: number | null
          avg_practice_minutes: number | null
          category: string | null
          key: string | null
          last_activity: string | null
          lesson_appearances: number | null
          level: string | null
          mastered_count: number | null
          song_id: string | null
          title: string | null
          total_students: number | null
        }
        Relationships: []
      }
      mv_song_popularity: {
        Row: {
          author: string | null
          avg_difficulty_rating: number | null
          level: string | null
          mastery_count: number | null
          mastery_rate: number | null
          song_id: string | null
          times_assigned: number | null
          title: string | null
          unique_students: number | null
        }
        Relationships: []
      }
      song_usage_stats: {
        Row: {
          song_id: string | null
          times_assigned: number | null
          title: string | null
        }
        Relationships: []
      }
      teacher_students: {
        Row: {
          student_id: string | null
          teacher_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lessons_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      user_overview: {
        Row: {
          created_at: string | null
          email: string | null
          is_admin: boolean | null
          is_student: boolean | null
          is_teacher: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          is_admin?: boolean | null
          is_student?: boolean | null
          is_teacher?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          is_admin?: boolean | null
          is_student?: boolean | null
          is_teacher?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_assignment_overview: {
        Row: {
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          status: Database["public"]["Enums"]["assignment_status"] | null
          student_id: string | null
          student_name: string | null
          teacher_id: string | null
          teacher_name: string | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "user_overview"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "v_teacher_lesson_trends"
            referencedColumns: ["teacher_id"]
          },
        ]
      }
      v_song_usage_stats: {
        Row: {
          author: string | null
          song_id: string | null
          times_assigned: number | null
          times_mastered: number | null
          title: string | null
          unique_students: number | null
        }
        Relationships: []
      }
      v_teacher_lesson_trends: {
        Row: {
          cancelled: number | null
          completed: number | null
          month: string | null
          scheduled: number | null
          teacher_id: string | null
          total: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_song_to_my_repertoire: {
        Args: { p_song_id: string }
        Returns: {
          added_by_student: boolean
          assigned_by: string | null
          capo_fret: number | null
          created_at: string
          current_status: Database["public"]["Enums"]["song_progress_status"]
          custom_strumming: string | null
          difficulty_rating: number | null
          id: string
          is_active: boolean | null
          last_practiced_at: string | null
          mastered_at: string | null
          practice_session_count: number | null
          preferred_key: Database["public"]["Enums"]["music_key"] | null
          priority: string | null
          self_rating: number | null
          self_rating_updated_at: string | null
          song_id: string
          sort_order: number | null
          started_at: string | null
          student_id: string
          student_notes: string | null
          teacher_notes: string | null
          total_practice_minutes: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "student_repertoire"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_old_audit_partitions: {
        Args: { months_to_keep?: number }
        Returns: undefined
      }
      audit_log_changes: {
        Args: {
          p_action: Database["public"]["Enums"]["audit_action"]
          p_changes: Json
          p_entity_id: string
          p_entity_type: Database["public"]["Enums"]["audit_entity"]
          p_metadata?: Json
        }
        Returns: string
      }
      can_access_lesson: { Args: { p_lesson_id: string }; Returns: boolean }
      can_manage_lesson: { Args: { p_lesson_id: string }; Returns: boolean }
      check_and_record_auth_rate_limit: {
        Args: { p_identifier: string; p_operation: string; p_window_ms: number }
        Returns: number
      }
      check_auth_rate_limit: {
        Args: { p_identifier: string; p_operation: string; p_window_ms: number }
        Returns: number
      }
      cleanup_auth_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_in_app_notifications: { Args: never; Returns: number }
      create_audit_log_partition: {
        Args: { month: number; year: number }
        Returns: undefined
      }
      current_profile_id: { Args: never; Returns: string }
      current_user_roles: {
        Args: never
        Returns: {
          is_admin: boolean
          is_student: boolean
          is_teacher: boolean
        }[]
      }
      find_similar_songs: {
        Args: { max_results?: number; search_title: string; threshold?: number }
        Returns: {
          author: string
          id: string
          similarity: number
          title: string
        }[]
      }
      get_bounce_stats: {
        Args: never
        Returns: {
          bounce_count: number
          notification_type: string
          total_sent: number
        }[]
      }
      get_pending_notifications: {
        Args: { batch_size?: number }
        Returns: {
          id: string
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: number
          recipient_email: string
          recipient_user_id: string
          scheduled_for: string
          template_data: Json
        }[]
      }
      get_system_email_count_last_hour: { Args: never; Returns: number }
      get_user_email_count_last_hour: {
        Args: { p_user_id: string }
        Returns: number
      }
      has_active_lesson_assignments: {
        Args: { p_song_id: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_teacher: { Args: never; Returns: boolean }
      is_child_of_parent: { Args: { _student_id: string }; Returns: boolean }
      is_notification_enabled: {
        Args: {
          p_notification_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: boolean
      }
      is_parent: { Args: never; Returns: boolean }
      is_student: { Args: never; Returns: boolean }
      is_teacher: { Args: never; Returns: boolean }
      jsonb_diff: { Args: { left_val: Json; right_val: Json }; Returns: Json }
      mark_overdue_assignments: { Args: never; Returns: number }
      migrate_pending_student: {
        Args: { p_auth_user_id: string; p_pending_id: string }
        Returns: boolean
      }
      profiles_signed_in: {
        Args: { p_profile_ids: string[] }
        Returns: {
          profile_id: string
        }[]
      }
      refresh_dashboard_stats: { Args: never; Returns: undefined }
      refresh_song_engagement: { Args: never; Returns: undefined }
      refresh_song_popularity: { Args: never; Returns: undefined }
      refresh_teacher_performance: { Args: never; Returns: undefined }
      remove_song_from_my_repertoire: {
        Args: { p_song_id: string }
        Returns: undefined
      }
      rls_staff_policy_hygiene_check: {
        Args: never
        Returns: {
          bare_clause: string
          bare_policy: string
          cmd: string
          scoped_sibling: string
          tablename: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_song: { Args: { p_song_id: string }; Returns: Json }
      soft_delete_song_with_cascade: {
        Args: { song_uuid: string; user_uuid: string }
        Returns: Json
      }
      student_complete_chord_drill: {
        Args: { p_assignment_id: string; p_score: number; p_total: number }
        Returns: {
          checklist: Json
          chord_drill: Json | null
          chord_drill_result: Json | null
          created_at: string
          daily_target_minutes: number | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          lesson_id: string | null
          song_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          submission_type: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      student_toggle_checklist_item: {
        Args: { p_assignment_id: string; p_done: boolean; p_item_id: string }
        Returns: {
          checklist: Json
          chord_drill: Json | null
          chord_drill_result: Json | null
          created_at: string
          daily_target_minutes: number | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          lesson_id: string | null
          song_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          submission_type: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      student_update_assignment_status: {
        Args: {
          p_assignment_id: string
          p_new_status: Database["public"]["Enums"]["assignment_status"]
        }
        Returns: {
          checklist: Json
          chord_drill: Json | null
          chord_drill_result: Json | null
          created_at: string
          daily_target_minutes: number | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          lesson_id: string | null
          song_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
          student_id: string
          submission_type: string
          teacher_id: string
          title: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      teacher_teaches_student: {
        Args: { _student_id: string; _teacher_id: string }
        Returns: boolean
      }
      transfer_shadow_profile_references: {
        Args: { p_new_id: string; p_old_id: string }
        Returns: Json
      }
      update_song_progress_from_practice: {
        Args: { p_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      ai_context_type:
        | "general"
        | "student"
        | "lesson"
        | "song"
        | "assignment"
        | "practice"
      ai_generation_type:
        | "lesson_notes"
        | "assignment"
        | "email_draft"
        | "post_lesson_summary"
        | "student_progress"
        | "admin_insights"
        | "chat"
      ai_message_role: "system" | "user" | "assistant"
      ai_prompt_category:
        | "email"
        | "lesson_notes"
        | "practice_plan"
        | "progress_report"
        | "feedback"
        | "reminder"
        | "custom"
      assignment_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "overdue"
        | "cancelled"
      audit_action:
        | "created"
        | "updated"
        | "deleted"
        | "status_changed"
        | "rescheduled"
        | "cancelled"
        | "completed"
        | "role_changed"
      audit_entity:
        | "profile"
        | "lesson"
        | "assignment"
        | "song"
        | "song_progress"
      auth_email_status: "not_applicable" | "sent" | "failed" | "skipped"
      auth_event_type:
        | "signup_attempted"
        | "signup_succeeded"
        | "signup_failed"
        | "email_confirmed"
        | "invite_sent"
        | "invite_failed"
        | "user_created_by_admin"
        | "shadow_user_created"
        | "signin_succeeded"
        | "signin_failed"
        | "signin_locked"
        | "signin_rate_limited"
        | "password_reset_requested"
        | "password_reset_failed"
        | "resend_verification_requested"
        | "resend_verification_failed"
        | "shadow_invite_email_set"
        | "shadow_invite_sent"
        | "shadow_link_completed"
        | "shadow_link_failed"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      lesson_song_status:
        | "to_learn"
        | "started"
        | "remembered"
        | "slow_tempo"
        | "with_author"
        | "mastered"
      lesson_status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
      log_level: "debug" | "info" | "warn" | "error"
      music_key:
        | "C"
        | "C#"
        | "Db"
        | "D"
        | "D#"
        | "Eb"
        | "E"
        | "F"
        | "F#"
        | "Gb"
        | "G"
        | "G#"
        | "Ab"
        | "A"
        | "A#"
        | "Bb"
        | "B"
        | "Cm"
        | "C#m"
        | "Dm"
        | "D#m"
        | "Ebm"
        | "Em"
        | "Fm"
        | "F#m"
        | "Gm"
        | "G#m"
        | "Am"
        | "A#m"
        | "Bbm"
        | "Bm"
      notification_delivery_channel: "email" | "in_app" | "both"
      notification_status:
        | "pending"
        | "sent"
        | "failed"
        | "bounced"
        | "skipped"
        | "cancelled"
      notification_type:
        | "lesson_reminder_24h"
        | "lesson_recap"
        | "lesson_cancelled"
        | "lesson_rescheduled"
        | "assignment_created"
        | "assignment_due_reminder"
        | "assignment_overdue_alert"
        | "assignment_completed"
        | "song_mastery_achievement"
        | "milestone_reached"
        | "student_welcome"
        | "trial_ending_reminder"
        | "teacher_daily_summary"
        | "weekly_progress_digest"
        | "calendar_conflict_alert"
        | "webhook_expiration_notice"
        | "admin_error_alert"
      song_progress_status:
        | "to_learn"
        | "started"
        | "remembered"
        | "with_author"
        | "mastered"
      spotify_match_status: "pending" | "approved" | "rejected" | "auto_applied"
      student_pipeline_status:
        | "lead"
        | "trial"
        | "active"
        | "inactive"
        | "churned"
      student_status: "active" | "archived"
      task_priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
      task_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "PENDING_REVIEW"
        | "COMPLETED"
        | "CANCELLED"
        | "BLOCKED"
      theoretical_course_level: "beginner" | "intermediate" | "advanced"
      user_role: "admin" | "teacher" | "student"
      video_type: "tutorial" | "short"
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
      ai_context_type: [
        "general",
        "student",
        "lesson",
        "song",
        "assignment",
        "practice",
      ],
      ai_generation_type: [
        "lesson_notes",
        "assignment",
        "email_draft",
        "post_lesson_summary",
        "student_progress",
        "admin_insights",
        "chat",
      ],
      ai_message_role: ["system", "user", "assistant"],
      ai_prompt_category: [
        "email",
        "lesson_notes",
        "practice_plan",
        "progress_report",
        "feedback",
        "reminder",
        "custom",
      ],
      assignment_status: [
        "not_started",
        "in_progress",
        "completed",
        "overdue",
        "cancelled",
      ],
      audit_action: [
        "created",
        "updated",
        "deleted",
        "status_changed",
        "rescheduled",
        "cancelled",
        "completed",
        "role_changed",
      ],
      audit_entity: [
        "profile",
        "lesson",
        "assignment",
        "song",
        "song_progress",
      ],
      auth_email_status: ["not_applicable", "sent", "failed", "skipped"],
      auth_event_type: [
        "signup_attempted",
        "signup_succeeded",
        "signup_failed",
        "email_confirmed",
        "invite_sent",
        "invite_failed",
        "user_created_by_admin",
        "shadow_user_created",
        "signin_succeeded",
        "signin_failed",
        "signin_locked",
        "signin_rate_limited",
        "password_reset_requested",
        "password_reset_failed",
        "resend_verification_requested",
        "resend_verification_failed",
        "shadow_invite_email_set",
        "shadow_invite_sent",
        "shadow_link_completed",
        "shadow_link_failed",
      ],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      lesson_song_status: [
        "to_learn",
        "started",
        "remembered",
        "slow_tempo",
        "with_author",
        "mastered",
      ],
      lesson_status: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      log_level: ["debug", "info", "warn", "error"],
      music_key: [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
        "Cm",
        "C#m",
        "Dm",
        "D#m",
        "Ebm",
        "Em",
        "Fm",
        "F#m",
        "Gm",
        "G#m",
        "Am",
        "A#m",
        "Bbm",
        "Bm",
      ],
      notification_delivery_channel: ["email", "in_app", "both"],
      notification_status: [
        "pending",
        "sent",
        "failed",
        "bounced",
        "skipped",
        "cancelled",
      ],
      notification_type: [
        "lesson_reminder_24h",
        "lesson_recap",
        "lesson_cancelled",
        "lesson_rescheduled",
        "assignment_created",
        "assignment_due_reminder",
        "assignment_overdue_alert",
        "assignment_completed",
        "song_mastery_achievement",
        "milestone_reached",
        "student_welcome",
        "trial_ending_reminder",
        "teacher_daily_summary",
        "weekly_progress_digest",
        "calendar_conflict_alert",
        "webhook_expiration_notice",
        "admin_error_alert",
      ],
      song_progress_status: [
        "to_learn",
        "started",
        "remembered",
        "with_author",
        "mastered",
      ],
      spotify_match_status: ["pending", "approved", "rejected", "auto_applied"],
      student_pipeline_status: [
        "lead",
        "trial",
        "active",
        "inactive",
        "churned",
      ],
      student_status: ["active", "archived"],
      task_priority: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      task_status: [
        "OPEN",
        "IN_PROGRESS",
        "PENDING_REVIEW",
        "COMPLETED",
        "CANCELLED",
        "BLOCKED",
      ],
      theoretical_course_level: ["beginner", "intermediate", "advanced"],
      user_role: ["admin", "teacher", "student"],
      video_type: ["tutorial", "short"],
    },
  },
} as const

