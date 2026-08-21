import { v2 as cloudinary } from "cloudinary";

/**
 * Server-only Cloudinary SDK instance. Never import this from a "use client"
 * component — the API secret must stay server-side. Client code that needs to
 * render an existing Cloudinary URL should use the loader/CloudinaryImage
 * component instead, and uploads go through the server actions in actions.ts.
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
