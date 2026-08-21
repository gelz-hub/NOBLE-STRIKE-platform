"use server";

import { createClient } from "@/lib/supabase/server";
import { uploadImage } from "./upload";
import { validateImageFile } from "./validation";
import { USE_CASE_FOLDER, type ImageUseCase, type UploadActionResult } from "./types";

/**
 * Generic authenticated image upload action, reused by every upload
 * component (team logo, team banner, player avatar, tournament banner,
 * news image). Only saves the file to Cloudinary and returns its URL —
 * associating that URL with a team/tournament/news row happens in the
 * caller's own server action (createTeam, saveRoster, createTournament, ...),
 * which is also where per-resource ownership/role checks belong.
 */
export async function uploadImageAction(
  useCase: ImageUseCase,
  formData: FormData
): Promise<UploadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to upload images." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file provided." };
  }

  const validationError = validateImageFile(file, useCase);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const category = USE_CASE_FOLDER[useCase];
    const data = await uploadImage(buffer, category);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Image upload failed.",
    };
  }
}
