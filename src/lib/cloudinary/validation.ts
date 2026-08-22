import { ACCEPTED_IMAGE_TYPES, IMAGE_SIZE_LIMITS, type ImageUseCase } from "./types";

export function validateImageFile(
  file: { type: string; size: number },
  useCase: ImageUseCase
): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "Unsupported file type. Please upload a JPEG, PNG, WebP, GIF, or HEIC image.";
  }

  const limit = IMAGE_SIZE_LIMITS[useCase];
  if (file.size > limit) {
    return `File is too large. Maximum size is ${Math.round(limit / (1024 * 1024))} MB.`;
  }

  return null;
}
