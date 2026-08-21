import { withCloudinaryTransform } from "./url";

/**
 * Registered as images.loaderFile in next.config.ts so every next/image
 * usage in the app automatically requests the right width from Cloudinary
 * (responsive sizes) with f_auto/q_auto baked in — no per-<Image> loader
 * prop needed.
 */
export default function cloudinaryLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return withCloudinaryTransform(src, { width });
}
