"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadImageAction } from "@/lib/cloudinary/actions";
import { validateImageFile } from "@/lib/cloudinary/validation";
import type { ImageUseCase } from "@/lib/cloudinary/types";

interface GalleryUploadProps {
  useCase: ImageUseCase;
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxImages?: number;
}

/** Multi-image variant of ImageUpload — used for event photo galleries (match schedules, posters, certificates). */
export function GalleryUpload({ useCase, urls, onChange, label, maxImages = 20 }: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFiles(files: FileList) {
    const remaining = maxImages - urls.length;
    const toUpload = Array.from(files).slice(0, Math.max(0, remaining));
    if (toUpload.length === 0) return;

    for (const file of toUpload) {
      const validationError = validateImageFile(file, useCase);
      if (validationError) {
        toast.error(validationError);
        continue;
      }
      const formData = new FormData();
      formData.set("file", file);
      startTransition(async () => {
        try {
          const result = await uploadImageAction(useCase, formData);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          onChange([...urls, result.data.url]);
        } catch {
          toast.error("Upload failed. Please check your connection and try again.");
        }
      });
    }
  }

  function removeAt(index: number) {
    onChange(urls.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs text-muted-foreground">{label}</p>}
      <div className="flex flex-wrap gap-2.5">
        {urls.map((url, i) => (
          <div
            key={url + i}
            className="relative w-20 h-20 rounded-lg overflow-hidden border border-gold/25 bg-black/40"
          >
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white"
              aria-label="Remove image"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {urls.length < maxImages && (
          <button
            type="button"
            onClick={() => !pending && inputRef.current?.click()}
            disabled={pending}
            className="w-20 h-20 rounded-lg border border-dashed border-gold/25 bg-black/40 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-gold/50 transition-colors disabled:opacity-60"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            <span className="text-[0.6rem]">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
