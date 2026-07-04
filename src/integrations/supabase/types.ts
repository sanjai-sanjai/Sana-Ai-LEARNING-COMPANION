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
  public: {
    Tables: {
      call_sessions: {
        Row: {
          action_taken: string | null
          created_at: string
          duration_seconds: number | null
          ended_at: string | null
          follow_up_at: string | null
          id: string
          mood: string | null
          promises: Json
          reminder_id: string | null
          started_at: string
          status: string
          summary: string | null
          topics: string[]
          transcript: Json
          twilio_call_sid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          follow_up_at?: string | null
          id?: string
          mood?: string | null
          promises?: Json
          reminder_id?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          topics?: string[]
          transcript?: Json
          twilio_call_sid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          duration_seconds?: number | null
          ended_at?: string | null
          follow_up_at?: string | null
          id?: string
          mood?: string | null
          promises?: Json
          reminder_id?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          topics?: string[]
          transcript?: Json
          twilio_call_sid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "study_call_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      classroom_announcements: {
        Row: {
          alternate_link: string | null
          created_at: string
          google_announcement_id: string
          google_course_id: string
          google_created_at: string | null
          google_updated_at: string | null
          id: string
          materials: Json
          state: string | null
          text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alternate_link?: string | null
          created_at?: string
          google_announcement_id: string
          google_course_id: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          materials?: Json
          state?: string | null
          text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alternate_link?: string | null
          created_at?: string
          google_announcement_id?: string
          google_course_id?: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          materials?: Json
          state?: string | null
          text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classroom_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          google_course_id: string
          id: string
          token_estimate: number | null
          user_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          google_course_id: string
          id?: string
          token_estimate?: number | null
          user_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          google_course_id?: string
          id?: string
          token_estimate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classroom_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "classroom_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_connections: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          google_name: string | null
          google_picture: string | null
          google_sub: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          refresh_token: string | null
          scope: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          google_name?: string | null
          google_picture?: string | null
          google_sub?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          google_name?: string | null
          google_picture?: string | null
          google_sub?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classroom_courses: {
        Row: {
          alternate_link: string | null
          course_state: string | null
          created_at: string
          description: string | null
          enrollment_code: string | null
          google_course_id: string
          google_created_at: string | null
          google_updated_at: string | null
          id: string
          name: string
          owner_id: string | null
          room: string | null
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alternate_link?: string | null
          course_state?: string | null
          created_at?: string
          description?: string | null
          enrollment_code?: string | null
          google_course_id: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          name: string
          owner_id?: string | null
          room?: string | null
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alternate_link?: string | null
          course_state?: string | null
          created_at?: string
          description?: string | null
          enrollment_code?: string | null
          google_course_id?: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          room?: string | null
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classroom_coursework: {
        Row: {
          alternate_link: string | null
          created_at: string
          description: string | null
          due_at: string | null
          google_course_id: string
          google_coursework_id: string
          google_created_at: string | null
          google_updated_at: string | null
          id: string
          materials: Json
          max_points: number | null
          state: string | null
          title: string
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          alternate_link?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          google_course_id: string
          google_coursework_id: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          materials?: Json
          max_points?: number | null
          state?: string | null
          title: string
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          alternate_link?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          google_course_id?: string
          google_coursework_id?: string
          google_created_at?: string | null
          google_updated_at?: string | null
          id?: string
          materials?: Json
          max_points?: number | null
          state?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      classroom_documents: {
        Row: {
          alternate_link: string | null
          chunk_count: number
          content_length: number | null
          created_at: string
          drive_file_id: string
          error: string | null
          google_course_id: string
          id: string
          indexed_at: string | null
          mime_type: string | null
          source_id: string
          source_type: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alternate_link?: string | null
          chunk_count?: number
          content_length?: number | null
          created_at?: string
          drive_file_id: string
          error?: string | null
          google_course_id: string
          id?: string
          indexed_at?: string | null
          mime_type?: string | null
          source_id: string
          source_type: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alternate_link?: string | null
          chunk_count?: number
          content_length?: number | null
          created_at?: string
          drive_file_id?: string
          error?: string | null
          google_course_id?: string
          id?: string
          indexed_at?: string | null
          mime_type?: string | null
          source_id?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      classroom_materials: {
        Row: {
          alternate_link: string | null
          created_at: string
          description: string | null
          google_course_id: string
          google_created_at: string | null
          google_material_id: string
          google_updated_at: string | null
          id: string
          materials: Json
          state: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alternate_link?: string | null
          created_at?: string
          description?: string | null
          google_course_id: string
          google_created_at?: string | null
          google_material_id: string
          google_updated_at?: string | null
          id?: string
          materials?: Json
          state?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alternate_link?: string | null
          created_at?: string
          description?: string | null
          google_course_id?: string
          google_created_at?: string | null
          google_material_id?: string
          google_updated_at?: string | null
          id?: string
          materials?: Json
          state?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      flashcards: {
        Row: {
          back: string
          bookmarked: boolean
          created_at: string
          difficulty: string | null
          explanation: string | null
          front: string
          hint: string | null
          id: string
          last_reviewed_at: string | null
          mastery: number
          set_id: string | null
          status: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          bookmarked?: boolean
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          front: string
          hint?: string | null
          id?: string
          last_reviewed_at?: string | null
          mastery?: number
          set_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          bookmarked?: boolean
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          front?: string
          hint?: string | null
          id?: string
          last_reviewed_at?: string | null
          mastery?: number
          set_id?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "revision_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content_md: string | null
          created_at: string
          id: string
          position: number
          progress_pct: number
          set_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_md?: string | null
          created_at?: string
          id?: string
          position?: number
          progress_pct?: number
          set_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_md?: string | null
          created_at?: string
          id?: string
          position?: number
          progress_pct?: number
          set_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "revision_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_preferences: {
        Row: {
          ai_personality: string | null
          completed_at: string | null
          created_at: string
          primary_goal: string | null
          study_style: string
          study_view_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_personality?: string | null
          completed_at?: string | null
          created_at?: string
          primary_goal?: string | null
          study_style?: string
          study_view_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_personality?: string | null
          completed_at?: string | null
          created_at?: string
          primary_goal?: string | null
          study_style?: string
          study_view_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          focus_score: number
          gender: string | null
          level: number
          location: string | null
          phone_e164: string | null
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          focus_score?: number
          gender?: string | null
          level?: number
          location?: string | null
          phone_e164?: string | null
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          focus_score?: number
          gender?: string | null
          level?: number
          location?: string | null
          phone_e164?: string | null
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          code_snippet: string | null
          correct_index: number
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: string
          options: Json
          question: string
          set_id: string
          topic: string | null
          user_id: string
        }
        Insert: {
          code_snippet?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question: string
          set_id: string
          topic?: string | null
          user_id: string
        }
        Update: {
          code_snippet?: string | null
          correct_index?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          question?: string
          set_id?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "revision_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          ai_call: boolean
          alert_before_minutes: number
          created_at: string
          dont_miss: boolean
          duration_minutes: number
          id: string
          last_fired_at: string | null
          persona: string
          quote: string | null
          repeat_mode: string
          scheduled_at: string
          status: string
          strict_mode: boolean
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_call?: boolean
          alert_before_minutes?: number
          created_at?: string
          dont_miss?: boolean
          duration_minutes?: number
          id?: string
          last_fired_at?: string | null
          persona?: string
          quote?: string | null
          repeat_mode?: string
          scheduled_at: string
          status?: string
          strict_mode?: boolean
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_call?: boolean
          alert_before_minutes?: number
          created_at?: string
          dont_miss?: boolean
          duration_minutes?: number
          id?: string
          last_fired_at?: string | null
          persona?: string
          quote?: string | null
          repeat_mode?: string
          scheduled_at?: string
          status?: string
          strict_mode?: boolean
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revision_sets: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          generated_at: string | null
          id: string
          last_revised_at: string | null
          progress_pct: number
          source: string
          subject_id: string | null
          thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          generated_at?: string | null
          id?: string
          last_revised_at?: string | null
          progress_pct?: number
          source?: string
          subject_id?: string | null
          thread_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          generated_at?: string | null
          id?: string
          last_revised_at?: string | null
          progress_pct?: number
          source?: string
          subject_id?: string | null
          thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revision_sets_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      study_call_reminders: {
        Row: {
          created_at: string
          extra: Json
          id: string
          last_called_at: string | null
          miss_count: number
          motivation_style: string
          next_call_at: string | null
          phone_e164: string
          repeat_type: string
          scheduled_at: string
          status: string
          study_topic: string | null
          title: string
          twilio_call_sid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extra?: Json
          id?: string
          last_called_at?: string | null
          miss_count?: number
          motivation_style?: string
          next_call_at?: string | null
          phone_e164: string
          repeat_type?: string
          scheduled_at: string
          status?: string
          study_topic?: string | null
          title: string
          twilio_call_sid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          extra?: Json
          id?: string
          last_called_at?: string | null
          miss_count?: number
          motivation_style?: string
          next_call_at?: string | null
          phone_e164?: string
          repeat_type?: string
          scheduled_at?: string
          status?: string
          study_topic?: string | null
          title?: string
          twilio_call_sid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          created_at: string
          id: string
          markdown: string | null
          message_id: string
          raw_response: string | null
          structured: Json
          style: string
          thread_id: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          markdown?: string | null
          message_id: string
          raw_response?: string | null
          structured: Json
          style?: string
          thread_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          markdown?: string | null
          message_id?: string
          raw_response?: string | null
          structured?: Json
          style?: string
          thread_id?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          id: string
          is_done: boolean
          position: number
          scheduled_time: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          scheduled_time?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_done?: boolean
          position?: number
          scheduled_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          id: string
          kind: string
          source_url: string | null
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          source_url?: string | null
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          source_url?: string | null
          storage_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      weak_areas: {
        Row: {
          accuracy_pct: number
          created_at: string
          id: string
          notes: string | null
          set_id: string
          topic: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          set_id: string
          topic: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          set_id?: string
          topic?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weak_areas_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "revision_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          end_seconds: number
          id: string
          start_seconds: number
          user_id: string
          video_id: string
          video_row_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          end_seconds?: number
          id?: string
          start_seconds?: number
          user_id: string
          video_id: string
          video_row_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          end_seconds?: number
          id?: string
          start_seconds?: number
          user_id?: string
          video_id?: string
          video_row_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_chunks_video_row_id_fkey"
            columns: ["video_row_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_videos: {
        Row: {
          channel_id: string | null
          channel_title: string | null
          chunk_count: number
          created_at: string
          description: string | null
          duration_seconds: number | null
          error: string | null
          id: string
          language: string | null
          last_opened_at: string
          published_at: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          transcript_error: string | null
          transcript_source: string | null
          transcript_status: string
          updated_at: string
          url: string
          user_id: string
          video_id: string
          view_count: number | null
        }
        Insert: {
          channel_id?: string | null
          channel_title?: string | null
          chunk_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          last_opened_at?: string
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript_error?: string | null
          transcript_source?: string | null
          transcript_status?: string
          updated_at?: string
          url: string
          user_id: string
          video_id: string
          view_count?: number | null
        }
        Update: {
          channel_id?: string | null
          channel_title?: string | null
          chunk_count?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          error?: string | null
          id?: string
          language?: string | null
          last_opened_at?: string
          published_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          transcript_error?: string | null
          transcript_source?: string | null
          transcript_status?: string
          updated_at?: string
          url?: string
          user_id?: string
          video_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_classroom_chunks: {
        Args: {
          match_count?: number
          query_embedding: string
          target_course_ids?: string[]
          target_user_id: string
        }
        Returns: {
          alternate_link: string
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_title: string
          google_course_id: string
          similarity: number
        }[]
      }
      match_youtube_chunks:
        | {
            Args: {
              match_count?: number
              query_embedding: string
              target_user_id: string
              target_video_ids: string[]
            }
            Returns: {
              chunk_index: number
              content: string
              end_seconds: number
              similarity: number
              start_seconds: number
              video_id: string
            }[]
          }
        | {
            Args: {
              match_count?: number
              max_end_seconds?: number
              min_start_seconds?: number
              query_embedding: string
              target_user_id: string
              target_video_ids: string[]
            }
            Returns: {
              chunk_index: number
              content: string
              end_seconds: number
              similarity: number
              start_seconds: number
              video_id: string
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
  public: {
    Enums: {},
  },
} as const
