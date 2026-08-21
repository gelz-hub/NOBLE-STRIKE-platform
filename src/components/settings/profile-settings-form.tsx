"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { Loader2, Plus, Save, Trash2, User } from "lucide-react";
import { updateProfileSettings, type ActionResult } from "@/app/settings/actions";
import { SOCIAL_PLATFORMS, MAX_SOCIAL_LINKS } from "@/lib/validation/profile";
import type { Profile, SocialLinkEntry } from "@/lib/types/database";

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-text-primary">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateProfileSettings, null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url ?? "");
  const [links, setLinks] = useState<SocialLinkEntry[]>(profile.social_links ?? []);

  function updateLink(index: number, patch: Partial<SocialLinkEntry>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="avatar_url" value={avatarUrl} />
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="social_links" value={JSON.stringify(links)} />

      <FormSection icon={User} title="Avatar & Banner">
        <div className="flex flex-wrap gap-6">
          <ImageUpload useCase="profileAvatar" label="Avatar" shape="circle" size={120} currentUrl={avatarUrl} onUploaded={setAvatarUrl} />
          <ImageUpload useCase="profileBanner" label="Banner" shape="wide" size={320} currentUrl={bannerUrl} onUploaded={setBannerUrl} />
        </div>
      </FormSection>

      <FormSection icon={User} title="Identity">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Username <span className="text-gold">*</span>
            </Label>
            <Input
              name="username"
              required
              defaultValue={profile.username ?? ""}
              placeholder="e.g. nightshade"
              className="ns-input"
            />
            <p className="text-[0.7rem] text-muted-foreground">3-20 characters: letters, numbers, underscores.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Display Name</Label>
            <Input
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              placeholder="Shown instead of your username where set"
              className="ns-input"
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Input
              name="country"
              defaultValue={profile.country ?? ""}
              placeholder="e.g. Philippines"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Discord Username</Label>
            <Input
              name="discord_username"
              defaultValue={profile.discord_username ?? ""}
              placeholder="username"
              className="ns-input"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Bio</Label>
          <Textarea
            name="bio"
            defaultValue={profile.bio ?? ""}
            maxLength={500}
            placeholder="Tell the community about yourself..."
            className="ns-input min-h-24"
          />
        </div>
      </FormSection>

      <FormSection icon={User} title="Social Links">
        <div className="space-y-3">
          {links.map((link, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <Select value={link.platform} onValueChange={(v) => updateLink(i, { platform: v })}>
                <SelectTrigger className="ns-input w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-gold/30">
                  {SOCIAL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={link.url}
                onChange={(e) => updateLink(i, { url: e.target.value })}
                placeholder="https://..."
                className="ns-input flex-1 min-w-48"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLinks((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-text-secondary hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {links.length < MAX_SOCIAL_LINKS && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinks((prev) => [...prev, { platform: SOCIAL_PLATFORMS[0], url: "" }])}
              className="ns-btn-outline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Link
            </Button>
          )}
        </div>
      </FormSection>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">Saved.</p>}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton />
      </div>
    </form>
  );
}
