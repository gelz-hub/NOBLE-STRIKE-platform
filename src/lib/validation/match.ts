import { z } from "zod";

export const EVIDENCE_TYPES = ["RESULT_SCREENSHOT", "LOBBY_SCREENSHOT", "REPLAY_SCREENSHOT"] as const;

export const scheduleMatchSchema = z.object({
  scheduled_at: z.string().min(1, "Date and time are required."),
  stream_url: z.union([z.string().url(), z.literal("")]).optional(),
  lobby_id: z.string().trim().max(60).optional(),
  lobby_password: z.string().trim().max(60).optional(),
  referee_id: z.string().uuid().optional().or(z.literal("")),
});

export type ScheduleMatchInput = z.infer<typeof scheduleMatchSchema>;

export const matchNotesSchema = z.object({
  admin_notes: z.string().trim().max(2000).optional(),
  result_notes: z.string().trim().max(2000).optional(),
});

export const openDisputeSchema = z.object({
  explanation: z.string().trim().min(10, "Please explain the dispute in at least 10 characters.").max(2000),
  evidence_urls: z.array(z.string().url()).max(10, "Maximum 10 evidence files."),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(["RESOLVED", "REJECTED"]),
  admin_response: z.string().trim().min(1, "Please explain the resolution.").max(2000),
});
