export const REPORT_REASONS = ["SPAM", "HARASSMENT", "SCAM", "INAPPROPRIATE", "OTHER"] as const;

export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  SPAM: "Spam",
  HARASSMENT: "Harassment",
  SCAM: "Scam or phishing",
  INAPPROPRIATE: "Inappropriate content",
  OTHER: "Other",
};
