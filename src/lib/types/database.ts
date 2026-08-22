// Hand-written types mirroring the Postgres schema (snake_case), used by
// Server Actions, dashboard/admin pages, and the migration script.
// Once the Supabase CLI is linked to the project, these can be replaced by
// `supabase gen types typescript`.

export type Role = "user" | "admin";
export type ThemePreference = "dark" | "light" | "system";
export type LocalePreference = "en" | "km";

export interface SocialLinkEntry {
  platform: string;
  url: string;
}

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
  discord_username: string | null;
  role: Role;
  theme_preference: ThemePreference;
  locale: LocalePreference;
  display_name: string | null;
  bio: string | null;
  banner_url: string | null;
  social_links: SocialLinkEntry[];
  privacy_public_profile: boolean;
  privacy_show_teams: boolean;
  privacy_show_match_history: boolean;
  privacy_show_discord: boolean;
  notify_tournament: boolean;
  notify_match: boolean;
  notify_news: boolean;
  notify_system: boolean;
  notify_email: boolean;
  notify_telegram: boolean;
  telegram_id: number | null;
  telegram_username: string | null;
  telegram_linked_at: string | null;
  created_at: string;
}

export interface TelegramLinkToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
}

export interface TelegramSettings {
  id: true;
  channel_id: string | null;
  notifications_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}

export interface Team {
  id: string;
  owner_id: string;
  team_name: string;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  is_official: boolean;
  game: "MLBB" | "HOK" | null;
  contact_number: string | null;
  captain_telegram: string | null;
  province: string | null;
  created_at: string;
}

export type RosterRole =
  | "EXP"
  | "JUNGLE"
  | "MID"
  | "GOLD"
  | "ROAM"
  | "SUB1"
  | "SUB2"
  | "COACH";

export interface TeamMember {
  id: string;
  team_id: string;
  player_name: string;
  role: RosterRole;
  is_captain: boolean;
  is_substitute: boolean;
  is_coach: boolean;
  game_id: string | null;
  avatar_url: string | null;
  user_id: string | null;
  created_at: string;
}

export type TournamentStatus =
  | "DRAFT"
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "ONGOING"
  | "COMPLETED"
  | "ARCHIVED";

export type BracketFormat = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION";
export type SeedingMethod = "RANDOM";

export interface Tournament {
  id: string;
  name_en: string;
  name_km: string | null;
  description_en: string | null;
  description_km: string | null;
  game_type: "MLBB" | "HOK";
  slug: string;
  max_teams: number;
  prize_pool: number;
  registration_deadline: string;
  start_date: string;
  status: TournamentStatus;
  format: "BO1" | "BO3" | "BO5";
  rules: string | null;
  banner_url: string | null;
  location: string | null;
  organizer: string | null;
  featured: boolean;
  bracket_format: BracketFormat;
  seeding_method: SeedingMethod;
  grand_final_reset_enabled: boolean;
  champion_team_id: string | null;
  champion_team_name: string | null;
  champion_date: string | null;
  runner_up_team_id: string | null;
  runner_up_team_name: string | null;
  created_at: string;
}

export type RegistrationStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN";

export interface TournamentRegistration {
  id: string;
  tournament_id: string;
  team_id: string;
  status: RegistrationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BracketStatus = "ACTIVE" | "LOCKED";

export interface Bracket {
  id: string;
  tournament_id: string;
  bracket_format: BracketFormat;
  status: BracketStatus;
  generated_at: string;
  generated_by: string | null;
}

export type BracketType = "upper" | "lower" | "grand_final" | "grand_final_reset";
export type MatchStatus =
  | "PENDING"
  | "SCHEDULED"
  | "READY"
  | "LIVE"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export type EvidenceType = "RESULT_SCREENSHOT" | "LOBBY_SCREENSHOT" | "REPLAY_SCREENSHOT";

export interface MatchEvidenceItem {
  url: string;
  type: EvidenceType;
  uploaded_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  bracket_id: string | null;
  bracket_type: BracketType;
  round_number: number;
  match_number: number;
  team_a_id: string | null;
  team_b_id: string | null;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  status: MatchStatus;
  best_of: "BO1" | "BO3" | "BO5";
  next_match_winner_id: string | null;
  next_match_loser_id: string | null;
  scheduled_at: string | null;
  stream_url: string | null;
  lobby_id: string | null;
  lobby_password: string | null;
  referee_id: string | null;
  admin_notes: string | null;
  result_notes: string | null;
  evidence_urls: MatchEvidenceItem[];
  created_at: string;
  updated_at: string;
}

export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface MatchDispute {
  id: string;
  match_id: string;
  team_id: string;
  opened_by: string | null;
  explanation: string;
  evidence_urls: string[];
  status: DisputeStatus;
  admin_response: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export type NotificationCategory = "tournament" | "match" | "news" | "system";

export type NewsCategory =
  | "ANNOUNCEMENT"
  | "TOURNAMENT"
  | "RESULTS"
  | "MAINTENANCE"
  | "UPDATE"
  | "COMMUNITY";

export type NewsStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface News {
  id: string;
  title_en: string;
  title_km: string | null;
  slug: string;
  content_en: string;
  content_km: string | null;
  excerpt_en: string | null;
  excerpt_km: string | null;
  category: NewsCategory;
  featured: boolean;
  pinned: boolean;
  image_url: string | null;
  author_id: string | null;
  status: NewsStatus;
  publish_at: string | null;
  view_count: number;
  seo_description: string | null;
  seo_keywords: string[] | null;
  tournament_id: string | null;
  created_at: string;
  updated_at: string;
}

export type LegacyEventCategory = "TOURNAMENT" | "COMMUNITY";
export type LegacyEventStatus = "COMPLETED" | "ARCHIVED" | "UPCOMING";

export interface LegacyEvent {
  id: string;
  year: number;
  title_en: string;
  title_km: string | null;
  category: LegacyEventCategory;
  status: LegacyEventStatus;
  event_date_label: string | null;
  game: string | null;
  teams_label: string | null;
  teams_max: number | null;
  format: string | null;
  organized_by: string | null;
  live_broadcast: boolean;
  entry_fee: string | null;
  tournament_mode: string | null;
  prize_pool_label: string | null;
  prize_pool_max: number | null;
  champion: string | null;
  runner_up: string | null;
  top_3_4: string[];
  support_team: string | null;
  views: number;
  description_en: string | null;
  description_km: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  display_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RecruitmentPostType = "LFT" | "LFP";
export type RecruitmentStatus = "OPEN" | "CLOSED";
export type RecruitmentRole = "EXP" | "JUNGLE" | "MID" | "GOLD" | "ROAM" | "SUB" | "COACH" | "ANY";

export interface RecruitmentPost {
  id: string;
  author_id: string;
  post_type: RecruitmentPostType;
  status: RecruitmentStatus;
  title: string;
  game: "MLBB" | "HOK";
  role: RecruitmentRole;
  rank: string | null;
  country: string | null;
  requirements: string | null;
  telegram_username: string;
  description: string;
  created_at: string;
  updated_at: string;
}
