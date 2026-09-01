"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
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
import { Switch } from "@/components/ui/switch";
import { LocaleTabs } from "@/components/admin/locale-tabs";
import { Loader2, Save, Trophy, Network } from "lucide-react";
import {
  GAME_TYPES,
  TOURNAMENT_STATUSES,
  BRACKET_FORMATS,
  MAX_TEAMS_OPTIONS,
  FEATURED_BRACKET_STAGES,
  slugify,
} from "@/lib/validation/tournament";
import type { FeaturedBracketStage } from "@/lib/types/database";
import { toDatetimeLocal } from "@/lib/format-datetime";
import type { ActionResult } from "@/app/admin/tournaments/actions";
import type { Tournament } from "@/lib/types/database";

const STATUS_LABELS: Record<(typeof TOURNAMENT_STATUSES)[number], string> = {
  DRAFT: "Draft",
  REGISTRATION_OPEN: "Registration Open",
  REGISTRATION_CLOSED: "Registration Closed",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const GAME_LABELS: Record<(typeof GAME_TYPES)[number], string> = {
  MLBB: "Mobile Legends: Bang Bang",
  HOK: "Honor of Kings",
};

const FEATURED_STAGE_LABELS: Record<FeaturedBracketStage, string> = {
  FULL: "Full Bracket",
  TOP_64: "Top 64",
  TOP_32: "Top 32",
  TOP_16: "Top 16",
  TOP_8: "Top 8",
  TOP_4: "Top 4",
};

interface TournamentFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: Partial<Tournament>;
  mode: "create" | "edit";
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("admin.tournaments.form");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? t("saving") : mode === "create" ? t("createSubmit") : t("editSubmit")}
    </Button>
  );
}

export function TournamentForm({ action, initial, mode }: TournamentFormProps) {
  const t = useTranslations("admin.tournaments.form");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [bannerUrl, setBannerUrl] = useState(initial?.banner_url ?? "");
  const [gameType, setGameType] = useState<string>(initial?.game_type ?? "MLBB");
  const [matchFormat, setMatchFormat] = useState<string>(initial?.format ?? "BO1");
  const [bracketFormat, setBracketFormat] = useState<string>(
    initial?.bracket_format ?? "SINGLE_ELIMINATION"
  );
  const [grandFinalReset, setGrandFinalReset] = useState(
    initial?.grand_final_reset_enabled ?? true
  );
  const [maxTeams, setMaxTeams] = useState<string>(String(initial?.max_teams ?? 32));
  const [featuredStage, setFeaturedStage] = useState<string>(
    initial?.featured_bracket_stage ?? "FULL"
  );
  const [status, setStatus] = useState<string>(initial?.status ?? "DRAFT");

  // React 19 calls `form.reset()` after a `<form action>` submission completes.
  // Every controlled Radix <Select> here registers a native "reset" listener
  // that snaps its value back to the one captured at mount — so after a save
  // the row persists correctly but the dropdowns (Featured Bracket Stage,
  // Status, …) visibly jump back to their original values. Swallow the reset
  // in the capture phase on a wrapper element (an ancestor of the <form>), so
  // it never reaches those listeners. There is no reset button in this form,
  // so nothing legitimate depends on the reset event firing.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const swallow = (e: Event) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    el.addEventListener("reset", swallow, true);
    return () => el.removeEventListener("reset", swallow, true);
  }, []);

  return (
    <div ref={wrapRef}>
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="game_type" value={gameType} />
      <input type="hidden" name="format" value={matchFormat} />
      <input type="hidden" name="bracket_format" value={bracketFormat} />
      <input type="hidden" name="grand_final_reset_enabled" value={grandFinalReset ? "true" : "false"} />
      <input type="hidden" name="max_teams" value={maxTeams} />
      <input type="hidden" name="featured_bracket_stage" value={featuredStage} />
      <input type="hidden" name="status" value={status} />

      {/* Basic Information */}
      <FormSection icon={Trophy} title={t("basicInformation")}>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("nameLabel")} <span className="text-gold">*</span>
          </Label>
          <LocaleTabs
            en={
              <Input
                id="name_en"
                name="name_en"
                required
                value={nameEn}
                onChange={(e) => {
                  setNameEn(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. NS Season 2 Championship"
                className="ns-input"
              />
            }
            km={
              <Input
                id="name_km"
                name="name_km"
                defaultValue={initial?.name_km ?? ""}
                placeholder="ឧទាហរណ៍៖ NS Season 2 Championship"
                className="ns-input"
              />
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug-display" className="text-xs text-muted-foreground">
            {t("slugLabel")} <span className="text-gold">*</span>
          </Label>
          <Input
            id="slug-display"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="ns-season-2-championship"
            className="ns-input font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("descriptionLabel")}</Label>
          <LocaleTabs
            en={
              <Textarea
                id="description_en"
                name="description_en"
                defaultValue={initial?.description_en ?? ""}
                maxLength={2000}
                placeholder="What's this tournament about?"
                className="ns-input min-h-24"
              />
            }
            km={
              <Textarea
                id="description_km"
                name="description_km"
                defaultValue={initial?.description_km ?? ""}
                maxLength={2000}
                placeholder="តើការប្រកួតនេះជាអ្វី?"
                className="ns-input min-h-24"
              />
            }
          />
        </div>

        <ImageUpload
          useCase="tournamentBanner"
          label={t("bannerImageLabel")}
          shape="wide"
          size={360}
          currentUrl={bannerUrl}
          onUploaded={setBannerUrl}
        />
      </FormSection>

      {/* Game Configuration */}
      <FormSection icon={Trophy} title={t("gameConfiguration")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("gameTypeLabel")} <span className="text-gold">*</span>
            </Label>
            <Select value={gameType} onValueChange={setGameType}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {GAME_TYPES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {GAME_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("matchFormatLabel")} <span className="text-gold">*</span>
            </Label>
            <Select value={matchFormat} onValueChange={setMatchFormat}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                <SelectItem value="BO1">{t("bo1")}</SelectItem>
                <SelectItem value="BO3">{t("bo3")}</SelectItem>
                <SelectItem value="BO5">{t("bo5")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {/* Tournament Settings */}
      <FormSection icon={Trophy} title={t("tournamentSettings")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("maxTeamsLabel")} <span className="text-gold">*</span>
            </Label>
            <Select value={maxTeams} onValueChange={setMaxTeams}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {MAX_TEAMS_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} Teams
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prize_pool" className="text-xs text-muted-foreground">
              {t("prizePoolLabel")}
            </Label>
            <Input
              id="prize_pool"
              name="prize_pool"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.prize_pool ?? 0}
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="registration_deadline" className="text-xs text-muted-foreground">
              {t("registrationDeadlineLabel")} <span className="text-gold">*</span>
            </Label>
            <Input
              id="registration_deadline"
              name="registration_deadline"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocal(initial?.registration_deadline)}
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="start_date" className="text-xs text-muted-foreground">
              {t("startDateLabel")} <span className="text-gold">*</span>
            </Label>
            <Input
              id="start_date"
              name="start_date"
              type="datetime-local"
              required
              defaultValue={toDatetimeLocal(initial?.start_date)}
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs text-muted-foreground">
              {t("locationLabel")}
            </Label>
            <Input
              id="location"
              name="location"
              defaultValue={initial?.location ?? ""}
              placeholder="Online / Venue"
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organizer" className="text-xs text-muted-foreground">
              {t("organizerLabel")}
            </Label>
            <Input
              id="organizer"
              name="organizer"
              defaultValue={initial?.organizer ?? "NOBLE STRIKE"}
              className="ns-input"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rules" className="text-xs text-muted-foreground">
            {t("rulesLabel")}
          </Label>
          <Textarea
            id="rules"
            name="rules"
            defaultValue={initial?.rules ?? ""}
            maxLength={4000}
            placeholder="Tournament rules and format details..."
            className="ns-input min-h-24"
          />
        </div>
      </FormSection>

      {/* Bracket Settings */}
      <FormSection icon={Network} title={t("bracketSettings")}>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              {t("bracketFormatLabel")} <span className="text-gold">*</span>
            </Label>
            <Select value={bracketFormat} onValueChange={setBracketFormat}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {BRACKET_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f === "SINGLE_ELIMINATION" ? t("singleElimination") : t("doubleElimination")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bracketFormat === "DOUBLE_ELIMINATION" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t("grandFinalResetLabel")}</Label>
              <div className="flex items-center gap-3 h-9">
                <Switch checked={grandFinalReset} onCheckedChange={setGrandFinalReset} />
                <span className="text-sm text-white/70">
                  {grandFinalReset ? t("enabled") : t("disabled")}
                </span>
              </div>
            </div>
          )}
        </div>
        {bracketFormat === "DOUBLE_ELIMINATION" && (
          <p className="text-xs text-muted-foreground">{t("seedingMethodNote")}</p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("featuredStageLabel")}</Label>
          <Select value={featuredStage} onValueChange={setFeaturedStage}>
            <SelectTrigger className="ns-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-gold/30">
              {FEATURED_BRACKET_STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {FEATURED_STAGE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{t("featuredStageNote")}</p>
        </div>
      </FormSection>

      {/* Status */}
      <FormSection icon={Trophy} title={t("statusLabel")}>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="ns-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-gold/30">
            {TOURNAMENT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-400">{t("saveSuccess")}</p>
      )}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton mode={mode} />
      </div>
    </form>
    </div>
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
        <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
          {title}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
      </div>
      {children}
    </div>
  );
}
