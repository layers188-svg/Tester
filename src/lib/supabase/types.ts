/**
 * Generated database types.
 *
 * This file is normally produced by:
 *   npx supabase gen types typescript --linked > src/lib/supabase/types.ts
 * against the real, linked Supabase project (brief §9/§21). No live
 * project exists in this build environment, so the shape below was
 * written by hand to match supabase/migrations exactly. Regenerate this
 * file the first time a real project is linked so it never drifts from
 * the actual schema.
 */

export type OpeningStatus = "draft" | "approved" | "scheduled" | "open" | "closed";
export type AccessType = "subscription" | "rental" | "free" | "mixed" | "unknown";
export type PlaybackAccessType = "subscription" | "rental" | "purchase" | "free";
export type WatchState = "saved" | "opened_service" | "watched";
export type ReviewVisibility = "private" | "circle" | "house_approved";
export type ModerationState = "visible" | "hidden" | "removed";
export type ProfileRole = "member" | "moderator" | "owner";
export type CircleRole = "member" | "organiser";
export type AttendanceResponse = "invited" | "attending" | "maybe" | "declined";
export type NotificationStatus = "pending" | "sending" | "sent" | "failed" | "cancelled";

/**
 * Shorthand matching postgrest-js's GenericTable shape
 * (Row/Insert/Update/Relationships). The `& Record<string, unknown>`
 * intersections aren't cosmetic — postgrest-js structurally requires
 * each member to satisfy an indexed type, and a plain reference to a
 * named interface (unlike an inline object literal) does not get an
 * implicit index signature, which otherwise collapses every table's
 * inferred type to `never`.
 */
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row & Record<string, unknown>;
  Insert: Insert & Record<string, unknown>;
  Update: Update & Record<string, unknown>;
  Relationships: [];
};

interface ProfileRow {
  id: string;
  display_name: string;
  avatar_path: string | null;
  city: string | null;
  timezone: string;
  role: ProfileRole;
  onboarding_complete: boolean;
  marketing_consent_at: string | null;
  marketing_consent_source: string | null;
  created_at: string;
  updated_at: string;
}

interface FilmRow {
  id: string;
  title: string;
  release_year: number | null;
  runtime_minutes: number;
  country_code: string | null;
  rights_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OpeningRow {
  id: string;
  opening_number: number;
  opens_at: string;
  closes_at: string | null;
  status: OpeningStatus;
  runtime_minutes: number;
  availability_count: number;
  minimum_access_type: AccessType;
  no_trailer_storage_path: string;
  no_trailer_poster_path: string | null;
  content_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface OpeningSecretRow {
  opening_id: string;
  film_id: string;
  approved_at: string | null;
  approved_by: string | null;
}

interface OpeningCueRow {
  id: string;
  opening_id: string;
  cue: string;
  sort_order: number;
}

interface PlaybackDestinationRow {
  id: string;
  film_id: string;
  territory: string;
  provider_name: string;
  access_type: PlaybackAccessType;
  deep_link: string;
  verified_at: string | null;
  is_active: boolean;
}

interface RevealRow {
  user_id: string;
  opening_id: string;
  revealed_at: string;
}

interface WatchRow {
  id: string;
  user_id: string;
  opening_id: string | null;
  sealed_recommendation_id: string | null;
  state: WatchState;
  watched_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SixWordReviewRow {
  id: string;
  user_id: string;
  opening_id: string | null;
  sealed_recommendation_id: string | null;
  body: string;
  word_count: number;
  visibility: ReviewVisibility;
  moderation_state: ModerationState;
  created_at: string;
  updated_at: string;
}

interface CircleRow {
  id: string;
  name: string;
  created_by: string;
  invite_code: string;
  default_screening_day: number | null;
  default_screening_time: string | null;
  created_at: string;
  updated_at: string;
}

interface CircleMemberRow {
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
}

interface SealedRecommendationRow {
  id: string;
  sender_id: string;
  secret_film_id: string;
  personal_note: string | null;
  runtime_minutes: number;
  scheduled_for: string | null;
  created_at: string;
}

interface SealedRecommendationRecipientRow {
  recommendation_id: string;
  recipient_id: string;
  revealed_at: string | null;
  watched_at: string | null;
}

interface SealedRecommendationCueRow {
  id: string;
  recommendation_id: string;
  cue: string;
  sort_order: number;
}

interface ScreeningRow {
  id: string;
  circle_id: string;
  sealed_recommendation_id: string | null;
  opening_id: string | null;
  scheduled_for: string;
  created_by: string;
  created_at: string;
}

interface ScreeningAttendanceRow {
  screening_id: string;
  user_id: string;
  response: AttendanceResponse;
  updated_at: string;
}

interface EmailPreferencesRow {
  user_id: string;
  nightly_opening: boolean;
  sealed_recommendations: boolean;
  screening_reminders: boolean;
  after_credits: boolean;
  editorial_edm: boolean;
  updated_at: string;
}

interface NotificationQueueRow {
  id: string;
  user_id: string;
  type: string;
  send_at: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  safe_metadata: Record<string, unknown>;
  created_at: string;
}

export interface RevealResult {
  title: string;
  release_year: number | null;
  providers: {
    provider_name: string;
    access_type: PlaybackAccessType;
    deep_link: string;
    territory: string;
  }[];
}

export interface SealedRecommendationSafe {
  id: string;
  sender_id: string;
  sender_display_name: string;
  personal_note: string | null;
  runtime_minutes: number;
  scheduled_for: string | null;
  created_at: string;
  cues: string[];
  revealed_at: string | null;
  watched_at: string | null;
}

export interface CircleActivityRow {
  kind: "watched" | "sent";
  actor_id: string;
  actor_display_name: string;
  happened_at: string | null;
}

export interface CircleMemberName {
  user_id: string;
  display_name: string;
  avatar_path: string | null;
  role: CircleRole;
  joined_at: string;
}

export interface LibraryItem {
  kind: "opening" | "recommendation";
  target_id: string;
  opening_number: number | null;
  watch_state: WatchState;
  watched_at: string | null;
  revealed: boolean;
  title: string | null;
  release_year: number | null;
  six_words: string | null;
}

export interface HouseOpening {
  id: string;
  opening_number: number;
  opens_at: string;
  status: OpeningStatus;
  runtime_minutes: number;
  revealed: boolean;
  title: string | null;
  release_year: number | null;
}

export interface CirclesActivityRow {
  kind: "watched" | "sent";
  actor_id: string;
  actor_display_name: string;
  circle_name: string;
  happened_at: string | null;
}

export interface MySealedRecommendation {
  id: string;
  sender_id: string;
  sender_display_name: string;
  is_sender: boolean;
  personal_note: string | null;
  runtime_minutes: number;
  scheduled_for: string | null;
  created_at: string;
  cues: string[];
  revealed_at: string | null;
  watched_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & { id: string; timezone: string }>;
      films: Table<FilmRow, Partial<FilmRow> & { title: string; runtime_minutes: number }>;
      openings: Table<
        OpeningRow,
        Partial<OpeningRow> & {
          opening_number: number;
          opens_at: string;
          runtime_minutes: number;
          no_trailer_storage_path: string;
        }
      >;
      opening_secrets: Table<
        OpeningSecretRow,
        Partial<OpeningSecretRow> & { opening_id: string; film_id: string }
      >;
      opening_cues: Table<OpeningCueRow, Partial<OpeningCueRow> & { opening_id: string; cue: string }>;
      playback_destinations: Table<
        PlaybackDestinationRow,
        Partial<PlaybackDestinationRow> & {
          film_id: string;
          territory: string;
          provider_name: string;
          access_type: PlaybackAccessType;
          deep_link: string;
        }
      >;
      reveals: Table<RevealRow, RevealRow>;
      watches: Table<WatchRow, Partial<WatchRow> & { user_id: string; state: WatchState }>;
      six_word_reviews: Table<
        SixWordReviewRow,
        Partial<SixWordReviewRow> & { user_id: string; body: string; word_count: number }
      >;
      circles: Table<
        CircleRow,
        Partial<CircleRow> & { name: string; created_by: string; invite_code?: string }
      >;
      circle_members: Table<
        CircleMemberRow,
        Partial<CircleMemberRow> & { circle_id: string; user_id: string }
      >;
      sealed_recommendations: Table<
        SealedRecommendationRow,
        Partial<SealedRecommendationRow> & {
          sender_id: string;
          secret_film_id: string;
          runtime_minutes: number;
        }
      >;
      sealed_recommendation_recipients: Table<
        SealedRecommendationRecipientRow,
        Partial<SealedRecommendationRecipientRow> & {
          recommendation_id: string;
          recipient_id: string;
        }
      >;
      sealed_recommendation_cues: Table<
        SealedRecommendationCueRow,
        Partial<SealedRecommendationCueRow> & { recommendation_id: string; cue: string }
      >;
      screenings: Table<
        ScreeningRow,
        Partial<ScreeningRow> & { circle_id: string; scheduled_for: string; created_by: string }
      >;
      screening_attendance: Table<
        ScreeningAttendanceRow,
        Partial<ScreeningAttendanceRow> & { screening_id: string; user_id: string }
      >;
      email_preferences: Table<EmailPreferencesRow, Partial<EmailPreferencesRow> & { user_id: string }>;
      notification_queue: Table<
        NotificationQueueRow,
        Partial<NotificationQueueRow> & {
          user_id: string;
          type: string;
          send_at: string;
          payload: Record<string, unknown>;
        }
      >;
      audit_log: Table<AuditLogRow, Partial<AuditLogRow> & { action: string; target_type: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      reveal_opening: { Args: { p_opening_id: string }; Returns: RevealResult[] };
      reveal_sealed_recommendation: {
        Args: { p_recommendation_id: string };
        Returns: RevealResult[];
      };
      get_sealed_recommendation_safe: {
        Args: { p_recommendation_id: string };
        Returns: SealedRecommendationSafe[];
      };
      join_circle_by_code: { Args: { p_invite_code: string }; Returns: string };
      get_circle_activity: { Args: { p_circle_id: string }; Returns: CircleActivityRow[] };
      create_sealed_recommendation: {
        Args: {
          p_film_title: string;
          p_release_year: number | null;
          p_runtime_minutes: number;
          p_recipient_ids: string[];
          p_personal_note: string | null;
          p_cues: string[];
          p_scheduled_for?: string | null;
          p_circle_id?: string | null;
        };
        Returns: string;
      };
      get_house_words: { Args: { p_limit?: number }; Returns: { body: string }[] };
      get_circle_member_names: { Args: { p_circle_id: string }; Returns: CircleMemberName[] };
      list_my_sealed_recommendations: { Args: Record<string, never>; Returns: MySealedRecommendation[] };
      get_my_library: { Args: Record<string, never>; Returns: LibraryItem[] };
      get_house_openings: { Args: Record<string, never>; Returns: HouseOpening[] };
      get_my_circles_activity: { Args: Record<string, never>; Returns: CirclesActivityRow[] };
    };
  };
}
