/**
 * Injects Cloudinary delivery transformations into an existing secure_url,
 * e.g. https://res.cloudinary.com/<cloud>/image/upload/v123/noble-strike/logos/x.png
 *   -> https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto,w_400/v123/noble-strike/logos/x.png
 *
 * f_auto negotiates WebP/AVIF automatically based on the request's Accept
 * header; q_auto picks the smallest quality that looks visually lossless.
 */
export function withCloudinaryTransform(
  url: string,
  transforms: { width?: number; height?: number } = {}
): string {
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url; // not a Cloudinary delivery URL — return unchanged

  const parts = ["f_auto", "q_auto"];
  if (transforms.width) parts.push(`w_${Math.round(transforms.width)}`);
  if (transforms.height) parts.push(`h_${Math.round(transforms.height)}`);

  const before = url.slice(0, idx + marker.length);
  const after = url.slice(idx + marker.length);
  return `${before}${parts.join(",")}/${after}`;
}
