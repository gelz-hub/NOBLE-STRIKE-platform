// NOBLE STRIKE — shared types

export type GameType = "MLBB" | "HOK";
export type TournamentStatus =
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "ONGOING"
  | "COMPLETED";
export type TeamStatus = "PENDING" | "APPROVED" | "REJECTED";
export type MatchStatus = "PENDING" | "COMPLETED";
export type MatchFormat = "BO1" | "BO3" | "BO5";
export type NewsCategory =
  | "TOURNAMENT_NEWS"
  | "TEAM_UPDATES"
  | "PLAYER_SIGNINGS"
  | "RESULTS"
  | "ANNOUNCEMENTS";
export type MemberType = "PLAYER" | "COACH" | "MANAGEMENT";
export type SponsorTier = "TITANIUM" | "PLATINUM" | "GOLD" | "PARTNER";
export type UserRole = "VISITOR" | "TEAM_MANAGER" | "ADMIN";

export type NSView =
  | "home"
  | "tournaments"
  | "teams"
  | "ns-team"
  | "news"
  | "brackets"
  | "admin";

export interface Team {
  id: string;
  name: string;
  logo: string | null;
  captainName: string;
  discordUsername: string;
  contactNumber: string;
  game: string;
  tournamentId: string | null;
  status: string;
  isOfficial: boolean;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  player5: string;
  substitute: string | null;
  region: string | null;
  tag: string | null;
  description: string | null;
  createdAt: string;
  tournament?: Tournament | null;
  achievements?: Achievement[];
  registrations?: Registration[];
}

export interface Tournament {
  id: string;
  name: string;
  game: string;
  slug: string;
  startDate: string;
  registrationDeadline: string;
  teamLimit: number;
  prizePool: string;
  rules: string;
  bannerImage: string | null;
  status: string;
  format: string;
  description: string | null;
  location: string | null;
  organizer: string | null;
  featured: boolean;
  createdAt: string;
  _count?: { teams: number; registrations: number };
}

export interface Registration {
  id: string;
  tournamentId: string;
  teamId: string;
  status: string;
  createdAt: string;
  tournament?: Tournament;
  team?: Team;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  matchIndex: number;
  teamAId: string | null;
  teamBId: string | null;
  teamA?: Team | null;
  teamB?: Team | null;
  scoreA: number;
  scoreB: number;
  winnerId: string | null;
  status: string;
  format: string;
  nextMatchId: string | null;
  scheduledAt: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category: string;
  featured: boolean;
  coverImage: string | null;
  author: string | null;
  published: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  date: string;
  placement: string | null;
}

export interface NSMember {
  id: string;
  name: string;
  ign: string | null;
  role: string;
  type: string;
  bio: string | null;
  image: string | null;
  joinDate: string | null;
  country: string | null;
  order: number;
}

export interface Sponsor {
  id: string;
  name: string;
  logo: string | null;
  tier: string;
  url: string | null;
  order: number;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  handle: string | null;
  order: number;
}

export interface Stats {
  tournaments: number;
  teams: number;
  prizePool: number;
  matches: number;
  players: number;
  registrations: number;
}

export const GAME_LABELS: Record<string, string> = {
  MLBB: "Mobile Legends: Bang Bang",
  HOK: "Honor of Kings",
};

export const STATUS_LABELS: Record<string, string> = {
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  ONGOING: "Live Now",
  COMPLETED: "Completed",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  COMPLETED_TEAM: "Active",
};

export const STATUS_PILL: Record<string, string> = {
  REGISTRATION_OPEN: "ns-pill-open",
  REGISTRATION_CLOSED: "ns-pill-closed",
  ONGOING: "ns-pill-ongoing",
  COMPLETED: "ns-pill-completed",
  PENDING: "ns-pill-pending",
  APPROVED: "ns-pill-approved",
  REJECTED: "ns-pill-rejected",
};

export const NEWS_CATEGORY_LABELS: Record<string, string> = {
  TOURNAMENT_NEWS: "Tournament News",
  TEAM_UPDATES: "Team Updates",
  PLAYER_SIGNINGS: "Player Signings",
  RESULTS: "Results",
  ANNOUNCEMENTS: "Announcements",
};

export const SPONSOR_TIER_LABELS: Record<string, string> = {
  TITANIUM: "Titanium Partner",
  PLATINUM: "Platinum Partner",
  GOLD: "Gold Partner",
  PARTNER: "Official Partner",
};
