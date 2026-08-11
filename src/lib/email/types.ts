export interface EmailPayload {
  to: string;
  subject: string;
  /** Preview/preheader text — shows in inbox lists, so it is exactly as sensitive as the subject. */
  previewText?: string;
  html: string;
  text: string;
  tags?: Record<string, string>;
}

export type OperationalEmailType =
  "nightly_opening" | "sealed_recommendation" | "screening_reminder" | "after_credits";

export type EditorialEmailType = "editorial_edm";

export type NotificationType = OperationalEmailType | EditorialEmailType;
