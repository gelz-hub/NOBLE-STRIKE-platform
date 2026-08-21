export type ImageCategory =
  | "logos"
  | "teams"
  | "banners"
  | "tournaments"
  | "players"
  | "news"
  | "match-evidence"
  | "profiles";

export const CLOUDINARY_FOLDERS: Record<ImageCategory, string> = {
  logos: "noble-strike/logos",
  teams: "noble-strike/teams",
  banners: "noble-strike/banners",
  tournaments: "noble-strike/tournaments",
  players: "noble-strike/players",
  news: "noble-strike/news",
  "match-evidence": "noble-strike/match-evidence",
  profiles: "noble-strike/profiles",
};

/** Max upload size in bytes, per use case. */
export const IMAGE_SIZE_LIMITS = {
  teamLogo: 5 * 1024 * 1024,
  playerAvatar: 5 * 1024 * 1024,
  teamBanner: 10 * 1024 * 1024,
  tournamentBanner: 10 * 1024 * 1024,
  newsImage: 10 * 1024 * 1024,
  matchEvidence: 10 * 1024 * 1024,
  profileAvatar: 5 * 1024 * 1024,
  profileBanner: 10 * 1024 * 1024,
} as const;

export type ImageUseCase = keyof typeof IMAGE_SIZE_LIMITS;

/** Maps each use case to the Cloudinary folder it uploads into. */
export const USE_CASE_FOLDER: Record<ImageUseCase, ImageCategory> = {
  teamLogo: "logos",
  playerAvatar: "players",
  teamBanner: "teams",
  tournamentBanner: "tournaments",
  newsImage: "news",
  matchEvidence: "match-evidence",
  profileAvatar: "profiles",
  profileBanner: "profiles",
};

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export type UploadActionResult =
  | { success: true; data: CloudinaryUploadResult }
  | { success: false; error: string };
