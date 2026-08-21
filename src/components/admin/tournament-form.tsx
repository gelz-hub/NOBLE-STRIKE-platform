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
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Trophy, Network } from "lucide-react";
import { GAME_TYPES, TOURNAMENT_STATUSES, BRACKET_FORMATS, slugify } from "@/lib/validation/tournament";
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

interface TournamentFormProps {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  initial?: Partial<Tournament>;
  mode: "create" | "edit";
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : mode === "create" ? "Create Tournament" : "Save Changes"}
    </Button>
  );
}

export function TournamentForm({ action, initial, mode }: TournamentFormProps) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const [title, setTitle] = useState(initial?.title ?? "");
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
  const [status, setStatus] = useState<string>(initial?.status ?? "DRAFT");

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="banner_url" value={bannerUrl} />
      <input type="hidden" name="game_type" value={gameType} />
      <input type="hidden" name="format" value={matchFormat} />
      <input type="hidden" name="bracket_format" value={bracketFormat} />
      <input type="hidden" name="grand_final_reset_enabled" value={grandFinalReset ? "true" : "false"} />
      <input type="hidden" name="status" value={status} />

      {/* Basic Information */}
      <FormSection icon={Trophy} title="Basic Information">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs text-muted-foreground">
            Tournament Name <span className="text-gold">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. NS Season 2 Championship"
            className="ns-input"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug-display" className="text-xs text-muted-foreground">
            Slug <span className="text-gold">*</span>
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
          <Label htmlFor="description" className="text-xs text-muted-foreground">
            Description
          </Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initial?.description ?? ""}
            maxLength={2000}
            placeholder="What's this tournament about?"
            className="ns-input min-h-24"
          />
        </div>

        <ImageUpload
          useCase="tournamentBanner"
          label="Banner Image"
          shape="wide"
          size={360}
          currentUrl={bannerUrl}
          onUploaded={setBannerUrl}
        />
      </FormSection>

      {/* Game Configuration */}
      <FormSection icon={Trophy} title="Game Configuration">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Game Type <span className="text-gold">*</span>
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
              Match Format <span className="text-gold">*</span>
            </Label>
            <Select value={matchFormat} onValueChange={setMatchFormat}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                <SelectItem value="BO1">Best of 1</SelectItem>
                <SelectItem value="BO3">Best of 3</SelectItem>
                <SelectItem value="BO5">Best of 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FormSection>

      {/* Tournament Settings */}
      <FormSection icon={Trophy} title="Tournament Settings">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="max_teams" className="text-xs text-muted-foreground">
              Max Teams <span className="text-gold">*</span>
            </Label>
            <Input
              id="max_teams"
              name="max_teams"
              type="number"
              min={2}
              max={1024}
              required
              defaultValue={initial?.max_teams ?? 32}
              className="ns-input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prize_pool" className="text-xs text-muted-foreground">
              Prize Pool ($)
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
              Registration Deadline <span className="text-gold">*</span>
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
              Tournament Start Date <span className="text-gold">*</span>
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
              Location
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
              Organizer
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
            Rules
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
      <FormSection icon={Network} title="Bracket Settings">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Bracket Format <span className="text-gold">*</span>
            </Label>
            <Select value={bracketFormat} onValueChange={setBracketFormat}>
              <SelectTrigger className="ns-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-gold/30">
                {BRACKET_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f === "SINGLE_ELIMINATION" ? "Single Elimination" : "Double Elimination"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {bracketFormat === "DOUBLE_ELIMINATION" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Grand Final Reset</Label>
              <div className="flex items-center gap-3 h-9">
                <Switch checked={grandFinalReset} onCheckedChange={setGrandFinalReset} />
                <span className="text-sm text-white/70">
                  {grandFinalReset ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          )}
        </div>
        {bracketFormat === "DOUBLE_ELIMINATION" && (
          <p className="text-xs text-muted-foreground">
            Seeding method: Random. Teams start in the upper bracket; a loss drops them to the
            lower bracket, a second loss eliminates them.
          </p>
        )}
      </FormSection>

      {/* Status */}
      <FormSection icon={Trophy} title="Status">
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
        <p className="text-sm text-emerald-400">Tournament updated successfully.</p>
      )}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton mode={mode} />
      </div>
    </form>
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
