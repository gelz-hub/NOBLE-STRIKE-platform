"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { uploadImageAction } from "@/lib/cloudinary/actions";
import { validateImageFile } from "@/lib/cloudinary/validation";
import type { ImageUseCase } from "@/lib/cloudinary/types";

interface ImageUploadProps {
  useCase: ImageUseCase;
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  label?: string;
  /** square (logo/avatar), circle (avatar), wide (banner) */
  shape?: "square" | "circle" | "wide";
  /** max width in px of the preview/dropzone. Defaults to 220. */
  size?: number;
  className?: string;
}

const SHAPE_CLASSES: Record<NonNullable<ImageUploadProps["shape"]>, string> = {
  square: "aspect-square rounded-xl",
  circle: "aspect-square rounded-full",
  wide: "aspect-[3/1] rounded-xl",
};

export function ImageUpload({
  useCase,
  currentUrl,
  onUploaded,
  label,
  shape = "square",
  size = 220,
  className,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [pending, startTransition] = useTransition();

  function handleFile(file: File) {
    const validationError = validateImageFile(file, useCase);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadImageAction(useCase, formData);
      URL.revokeObjectURL(localPreview);
      if (!result.success) {
        toast.error(result.error);
        setPreview(currentUrl ?? null);
        return;
      }
      setPreview(result.data.url);
      onUploaded(result.data.url);
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !pending && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        style={{ width: "100%", maxWidth: size }}
        className={cn(
          "relative overflow-hidden border border-dashed border-gold/25 bg-black/40 flex items-center justify-center cursor-pointer transition-colors hover:border-gold/50",
          SHAPE_CLASSES[shape],
          pending && "pointer-events-none opacity-70"
        )}
      >
        {preview ? (
          <Image
            src={preview}
            alt={label || "Uploaded image"}
            fill
            sizes={`${size}px`}
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex flex-col items-center gap-1.5 text-muted-foreground text-center",
              size < 120 ? "p-1.5" : "p-4"
            )}
          >
            <ImagePlus className={size < 120 ? "w-4 h-4" : "w-6 h-6"} />
            {size >= 120 && <span className="text-xs">Click to upload</span>}
          </div>
        )}

        {pending && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-gold animate-spin" />
          </div>
        )}

        {preview && !pending && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              onUploaded("");
            }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white"
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
