"use client";

import { useActionState, useState } from "react";
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
import { Loader2, ArrowRight, Save } from "lucide-react";
import type { ActionResult } from "@/app/dashboard/teams/actions";
import { trackEvent } from "@/lib/analytics";
import { CAMBODIA_PROVINCES, TEAM_GAMES } from "@/lib/validation/team";

const GAME_LABELS: Record<string, string> = { MLBB: "Mobile Legends: Bang Bang", HOK: "Honor of Kings" };

interface TeamIdentityFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: {
    team_name?: string;
    logo_url?: string | null;
    banner_url?: string | null;
    description?: string | null;
    game?: string | null;
    contact_number?: string | null;
    captain_telegram?: string | null;
    province?: string | null;
  };
  submitLabel?: string;
  mode?: "create" | "edit";
}

function SubmitButton({ label, mode }: { label: string; mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const t = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : mode === "create" ? (
        <ArrowRight className="w-4 h-4" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {pending ? t("saving") : label}
    </Button>
  );
}

export function TeamIdentityForm({
  action,
  initial,
  submitLabel,
  mode = "create",
}: TeamIdentityFormProps) {
  const t = useTranslations("dashboard.team");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const resolvedSubmitLabel = submitLabel ?? t("continue");
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [bannerUrl, setBannerUrl] = useState(initial?.banner_url ?? "");
  const [game, setGame] = useState(initial?.game ?? "MLBB");
  const [province, setProvince] = useState(initial?.province ?? "Phnom Penh");

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
      <input type="hidden" name="game" value={game} />
      <input type="hidden" name="province" value={province} />

      <div className="space-y-1.5">
        <Label htmlFor="team_name" className="text-xs text-muted-foreground">
          {t("teamNameLabel")} <span className="text-gold">*</span>
        </Label>
        <Input
          id="team_name"
          name="team_name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={initial?.team_name}
          placeholder={t("teamNamePlaceholder")}
          className="ns-input"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <ImageUpload
            useCase="teamLogo"
            label={t("teamLogoLabel")}
            shape="square"
            currentUrl={logoUrl}
            onUploaded={setLogoUrl}
          />
          <p className="text-[0.7rem] text-muted-foreground">{t("teamLogoHint")}</p>
        </div>
        <ImageUpload
          useCase="teamBanner"
          label={t("teamBannerLabel")}
          shape="wide"
          currentUrl={bannerUrl}
          onUploaded={setBannerUrl}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("gameLabel")} <span className="text-gold">*</span>
          </Label>
          <Select value={game} onValueChange={setGame}>
            <SelectTrigger className="ns-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-gold/30">
              {TEAM_GAMES.map((g) => (
                <SelectItem key={g} value={g}>
                  {GAME_LABELS[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {t("provinceLabel")} <span className="text-gold">*</span>
          </Label>
          <Select value={province} onValueChange={setProvince}>
            <SelectTrigger className="ns-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-gold/30 max-h-72">
              {CAMBODIA_PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[0.7rem] text-muted-foreground">{t("provinceHint")}</p>
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs text-white">{t("captainContactTitle")}</Label>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">{t("captainContactHint")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="captain_telegram" className="text-xs text-muted-foreground">
              {t("captainTelegramLabel")} <span className="text-gold">*</span>
            </Label>
            <Input
              id="captain_telegram"
              name="captain_telegram"
              required
              minLength={5}
              maxLength={33}
              defaultValue={initial?.captain_telegram ?? ""}
              placeholder="@noblestrike"
              className="ns-input"
            />
            <p className="text-[0.7rem] text-muted-foreground">{t("captainTelegramHint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_number" className="text-xs text-muted-foreground">
              {t("captainContactNumberLabel")} <span className="text-gold">*</span>
            </Label>
            <Input
              id="contact_number"
              name="contact_number"
              required
              defaultValue={initial?.contact_number ?? ""}
              placeholder="+85512345678"
              className="ns-input"
            />
            <p className="text-[0.7rem] text-muted-foreground">{t("captainContactNumberHint")}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs text-muted-foreground">
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id="description"
          name="description"
          maxLength={1000}
          defaultValue={initial?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
          className="ns-input min-h-24"
        />
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && (
        <p className="text-sm text-emerald-400">{t("teamUpdated")}</p>
      )}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton label={resolvedSubmitLabel} mode={mode} />
      </div>
    </form>
  );
}
