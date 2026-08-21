"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { Loader2, ArrowRight, Save } from "lucide-react";
import type { ActionResult } from "@/app/dashboard/teams/actions";
import { trackEvent } from "@/lib/analytics";

interface TeamIdentityFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: {
    team_name?: string;
    logo_url?: string | null;
    banner_url?: string | null;
    description?: string | null;
  };
  submitLabel?: string;
  mode?: "create" | "edit";
}

function SubmitButton({ label, mode }: { label: string; mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : mode === "create" ? (
        <ArrowRight className="w-4 h-4" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {pending ? "Saving..." : label}
    </Button>
  );
}

export function TeamIdentityForm({
  action,
  initial,
  submitLabel = "Continue",
  mode = "create",
}: TeamIdentityFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial?.banner_url ?? "");

  return (
    <form
      action={formAction}
      onSubmit={() => {
        // createTeam redirects server-side on success (no client-visible
        // success state to hook into) — tracked on submit rather than
        // after confirmation, standard for redirect-driven form flows.
        if (mode === "create") trackEvent("team_created");
      }}
      className="space-y-6"
    >
      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="banner_url" value={bannerUrl} />

      <div className="space-y-1.5">
        <Label htmlFor="team_name" className="text-xs text-muted-foreground">
          Team Name <span className="text-gold">*</span>
        </Label>
        <Input
          id="team_name"
          name="team_name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={initial?.team_name}
          placeholder="e.g. Eclipse Empire"
          className="ns-input"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <ImageUpload
          useCase="teamLogo"
          label="Team Logo"
          shape="square"
          currentUrl={logoUrl}
          onUploaded={setLogoUrl}
        />
        <ImageUpload
          useCase="teamBanner"
          label="Team Banner"
          shape="wide"
          currentUrl={bannerUrl}
          onUploaded={setBannerUrl}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          Description
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          defaultValue={initial?.description ?? ""}
          placeholder="Tell us about your team..."
          className="ns-input min-h-24"
        />
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-400">Team updated successfully.</p>
      )}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton label={submitLabel} mode={mode} />
      </div>
    </form>
  );
}
