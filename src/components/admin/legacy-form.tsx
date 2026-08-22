"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { GalleryUpload } from "@/components/cloudinary/gallery-upload";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { Loader2, Save, Trophy } from "lucide-react";
import { LEGACY_EVENT_CATEGORIES, LEGACY_EVENT_STATUSES } from "@/lib/validation/legacy";
import type { ActionResult } from "@/app/admin/legacy/actions";
import type { LegacyEvent } from "@/lib/types/database";

interface LegacyFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: Partial<LegacyEvent>;
  mode: "create" | "edit";
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("admin.legacy");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? t("saving") : mode === "create" ? t("createEvent") : t("saveChanges")}
    </Button>
  );
}

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
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}

export function LegacyForm({ action, initial, mode }: LegacyFormProps) {
  const t = useTranslations("admin.legacy");
  const tCategory = useTranslations("legacy.category");
  const tStatus = useTranslations("legacy.status");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [category, setCategory] = useState<string>(initial?.category ?? "TOURNAMENT");
  const [status, setStatus] = useState<string>(initial?.status ?? "COMPLETED");
  const [liveBroadcast, setLiveBroadcast] = useState(initial?.live_broadcast ?? false);
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true);
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.cover_image_url ?? "");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(initial?.gallery_urls ?? []);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="live_broadcast" value={liveBroadcast ? "true" : "false"} />
      <input type="hidden" name="is_published" value={isPublished ? "true" : "false"} />
      <input type="hidden" name="cover_image_url" value={coverImageUrl} />
      <input type="hidden" name="gallery_urls" value={JSON.stringify(galleryUrls)} />

      <FormSection icon={Trophy} title={t("sections.identity")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("fields.year")} <span className="text-gold">*</span>
            </Label>
            <Input
              name="year"
              type="number"
              required
              min={2000}
              max={2100}
              defaultValue={initial?.year ?? new Date().getFullYear()}
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("fields.category")} <span className="text-gold">*</span>
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {LEGACY_EVENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {tCategory(c.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("fields.title")} <span className="text-gold">*</span>
          </Label>
          <LocaleTabs
            en={
              <Input
                name="title_en"
                required
                minLength={2}
                maxLength={150}
                defaultValue={initial?.title_en ?? ""}
                placeholder="e.g. NST Friendly Match 2025"
                className="ns-input"
              />
            }
            km={
              <Input
                name="title_km"
                maxLength={150}
                defaultValue={initial?.title_km ?? ""}
                className="ns-input"
              />
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("fields.date")}</Label>
          <Input
            name="event_date_label"
            defaultValue={initial?.event_date_label ?? ""}
            placeholder="e.g. October 2-6, 2025"
            className="ns-input"
          />
        </div>
        <ImageUpload
          useCase="legacyEventImage"
          label={t("fields.coverImage")}
          shape="wide"
          size={360}
          currentUrl={coverImageUrl}
          onUploaded={setCoverImageUrl}
        />
      </FormSection>

      <FormSection icon={Trophy} title={t("sections.details")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.game")}</Label>
            <Input
              name="game"
              defaultValue={initial?.game ?? ""}
              placeholder="e.g. Mobile Legends: Bang Bang"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.format")}</Label>
            <Input name="format" defaultValue={initial?.format ?? ""} placeholder="e.g. BO1" className="ns-input" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.teamsLabel")}</Label>
            <Input
              name="teams_label"
              defaultValue={initial?.teams_label ?? ""}
              placeholder="e.g. 16 or 64-128"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.teamsMax")}</Label>
            <Input
              name="teams_max"
              type="number"
              min={0}
              defaultValue={initial?.teams_max ?? ""}
              placeholder="e.g. 128"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.prizePoolLabel")}</Label>
            <Input
              name="prize_pool_label"
              defaultValue={initial?.prize_pool_label ?? ""}
              placeholder="e.g. $333 or $250-300"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.prizePoolMax")}</Label>
            <Input
              name="prize_pool_max"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.prize_pool_max ?? ""}
              placeholder="e.g. 333"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.entryFee")}</Label>
            <Input
              name="entry_fee"
              defaultValue={initial?.entry_fee ?? ""}
              placeholder="e.g. $6 per team"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.tournamentMode")}</Label>
            <Input
              name="tournament_mode"
              defaultValue={initial?.tournament_mode ?? ""}
              placeholder="e.g. Professional Tournament Mode"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.organizedBy")}</Label>
            <Input
              name="organized_by"
              defaultValue={initial?.organized_by ?? ""}
              placeholder="e.g. Noble Strike"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.supportTeam")}</Label>
            <Input
              name="support_team"
              defaultValue={initial?.support_team ?? ""}
              placeholder="e.g. Quince Esport"
              className="ns-input"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={liveBroadcast} onCheckedChange={setLiveBroadcast} />
          <span className="text-sm text-white/80">{t("fields.liveBroadcast")}</span>
        </div>
      </FormSection>

      <FormSection icon={Trophy} title={t("sections.results")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.champion")}</Label>
            <Input
              name="champion"
              defaultValue={initial?.champion ?? ""}
              placeholder="e.g. Team Seven NS"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.runnerUp")}</Label>
            <Input
              name="runner_up"
              defaultValue={initial?.runner_up ?? ""}
              placeholder="e.g. Cinder Icon"
              className="ns-input"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("fields.top34")}</Label>
          <Input
            name="top_3_4"
            defaultValue={initial?.top_3_4?.join(", ") ?? ""}
            placeholder="e.g. Abysal Celestial, Thunder Empire"
            className="ns-input"
          />
        </div>
      </FormSection>

      <FormSection icon={Trophy} title={t("sections.assets")}>
        <GalleryUpload
          useCase="legacyEventImage"
          urls={galleryUrls}
          onChange={setGalleryUrls}
          label={t("fields.gallery")}
        />
      </FormSection>

      <FormSection icon={Trophy} title={t("sections.statusAndDescription")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.status")}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {LEGACY_EVENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tStatus(s.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("fields.displayOrder")}</Label>
            <Input
              name="display_order"
              type="number"
              defaultValue={initial?.display_order ?? 0}
              className="ns-input"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("fields.description")}</Label>
          <LocaleTabs
            en={
              <Textarea
                name="description_en"
                defaultValue={initial?.description_en ?? ""}
                maxLength={500}
                placeholder="e.g. Historical records are currently being restored..."
                className="ns-input min-h-16"
              />
            }
            km={
              <Textarea
                name="description_km"
                defaultValue={initial?.description_km ?? ""}
                maxLength={500}
                className="ns-input min-h-16"
              />
            }
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          <span className="text-sm text-white/80">{t("fields.isPublished")}</span>
        </div>
      </FormSection>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">{t("saved")}</p>}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}
