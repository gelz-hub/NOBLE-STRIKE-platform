import "server-only";
import { cloudinary } from "./config";
import { CLOUDINARY_FOLDERS, type ImageCategory, type CloudinaryUploadResult } from "./types";

/**
 * Uploads an image buffer to Cloudinary under noble-strike/<category>,
 * with automatic format/quality optimization (f_auto, q_auto) baked into
 * every delivery URL Cloudinary generates for this asset.
 */
export async function uploadImage(
  buffer: Buffer,
  category: ImageCategory
): Promise<CloudinaryUploadResult> {
  const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDERS[category],
        resource_type: "image",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });

  return result;
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
