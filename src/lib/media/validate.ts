/**
 * No Trailer media checks (brief §12).
 */

export const ACCEPTED_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — a small beta limit suitable for Supabase Free storage.
export const PREFERRED_DURATION_SECONDS: [number, number] = [8, 12];
export const PREFERRED_DIMENSIONS = { width: 1080, height: 1920 };

export interface MediaValidationIssue {
  code: string;
  message: string;
  blocking: boolean;
}

export function validateMediaFile(
  file: { type: string; size: number; name: string },
  filmTitle: string,
): MediaValidationIssue[] {
  const issues: MediaValidationIssue[] = [];

  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    issues.push({ code: "mime", message: "Only MP4 or WebM files are accepted.", blocking: true });
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    issues.push({
      code: "size",
      message: `File is larger than the ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB beta limit.`,
      blocking: true,
    });
  }

  if (filenameContainsTitle(file.name, filmTitle)) {
    issues.push({
      code: "filename",
      message: "The filename contains the film title. Rename it before uploading.",
      blocking: true,
    });
  }

  return issues;
}

/** Brief §12 rule 5: "Reject filenames containing the film title." */
export function filenameContainsTitle(filename: string, title: string): boolean {
  const normalizedTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  if (normalizedTitle.length === 0) return false;
  const normalizedFilename = filename.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalizedFilename.includes(normalizedTitle);
}

/** Brief §12 rule 6: "Use a UUID storage name." */
export function generateStorageName(mimeType: string): string {
  const ext = mimeType === "video/webm" ? "webm" : "mp4";
  return `${crypto.randomUUID()}.${ext}`;
}

export function isDurationInPreferredRange(seconds: number): boolean {
  return seconds >= PREFERRED_DURATION_SECONDS[0] && seconds <= PREFERRED_DURATION_SECONDS[1];
}
