"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { Crown, Loader2, Pencil, Phone, Plus, Save, Send, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { rosterSchema, REQUIRED_ROLES, getRoleLabelsForGame, type RosterMemberInput } from "@/lib/validation/team";
import type { RosterRole, TeamMember } from "@/lib/types/database";
import { saveRoster } from "@/app/dashboard/teams/actions";

interface TeamRosterFormProps {
  teamId: string;
  game?: string | null;
  contactNumber?: string | null;
  captainTelegram?: string | null;
  initialMembers: TeamMember[];
}

type Row = RosterMemberInput;

function emptyRow(role: RosterRole): Row {
  return {
    role,
    player_name: "",
    game_id: "",
    avatar_url: "",
    is_captain: false,
  };
}

function buildInitialRows(initialMembers: TeamMember[]): Row[] {
  const byRole = new Map(initialMembers.map((m) => [m.role, m]));
  const rows: Row[] = REQUIRED_ROLES.map((role) => {
    const existing = byRole.get(role);
    return existing
      ? {
          role,
          player_name: existing.player_name,
          game_id: existing.game_id ?? "",
          avatar_url: existing.avatar_url ?? "",
          is_captain: existing.is_captain,
        }
      : emptyRow(role);
  });
  for (const role of ["SUB1", "SUB2", "COACH"] as const) {
    const existing = byRole.get(role);
    if (existing) {
      rows.push({
        role,
        player_name: existing.player_name,
        game_id: existing.game_id ?? "",
        avatar_url: existing.avatar_url ?? "",
        is_captain: false,
      });
    }
  }
  return rows;
}

export function TeamRosterForm({
  teamId,
  game,
  contactNumber,
  captainTelegram,
  initialMembers,
}: TeamRosterFormProps) {
  const t = useTranslations();
  const tRoster = useTranslations("dashboard.roster");
  const roleLabels = getRoleLabelsForGame(game);
  const [rows, setRows] = useState<Row[]>(() => buildInitialRows(initialMembers));
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

  /** Zod messages are dot-path keys, optionally `key|role` — see src/lib/validation/team.ts. */
  function resolveIssue(raw: string): string {
    const [key, param] = raw.split("|");
    if (!t.has(key)) return raw;
    return param ? t(key, { role: param }) : t(key);
  }

  const hasSub1 = rows.some((r) => r.role === "SUB1");
  const hasSub2 = rows.some((r) => r.role === "SUB2");
  const hasCoach = rows.some((r) => r.role === "COACH");

  function updateRow(role: RosterRole, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.role === role ? { ...r, ...patch } : r)));
  }

  function setCaptain(role: RosterRole) {
    setRows((prev) => prev.map((r) => ({ ...r, is_captain: r.role === role })));
  }

  function addRow(role: RosterRole) {
    setRows((prev) => [...prev, emptyRow(role)]);
  }

  function removeRow(role: RosterRole) {
    setRows((prev) => prev.filter((r) => r.role !== role));
  }

  function handleSave() {
    const parsed = rosterSchema.safeParse(rows);
    if (!parsed.success) {
      const messages = [...new Set(parsed.error.issues.map((i) => resolveIssue(i.message)))];
      setErrors(messages);
      return;
    }
    setErrors([]);
    startTransition(async () => {
      const result = await saveRoster(teamId, parsed.data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(tRoster("rosterSaved"));
      router.push(`/teams/${teamId}`);
    });
  }

  const starting = rows.filter((r) => (REQUIRED_ROLES as readonly string[]).includes(r.role));
  const subs = rows.filter((r) => r.role === "SUB1" || r.role === "SUB2");
  const coach = rows.find((r) => r.role === "COACH");
  const captainRow = rows.find((r) => r.is_captain);
  const startingFilled = starting.filter((r) => r.player_name.trim().length > 0).length;

  return (
    <div className="space-y-8">
      {/* Roster progress */}
      <section className="ns-card rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <ProgressStat label={tRoster("startingPlayers")} value={startingFilled} max={REQUIRED_ROLES.length} />
        <ProgressStat label={tRoster("substitutes")} value={subs.length} max={2} />
        <ProgressStat label={tRoster("coach")} value={coach ? 1 : 0} max={1} />
      </section>

      {/* Captain Information — the team's sole point of contact */}
      <section className="space-y-3">
        <SectionLabel icon={Crown} title={tRoster("captainInfoTitle")} />
        <div className="ns-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-wider">
                {tRoster("captainIgn")}
              </p>
              <p className="text-white font-medium truncate">
                {captainRow?.player_name || tRoster("noCaptainSelected")}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 text-sm">
              <Send className="w-3.5 h-3.5 text-gold/70 shrink-0" />
              <span className="text-white/90 truncate">{captainTelegram || tRoster("notSet")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-gold/70 shrink-0" />
              <span className="text-white/90 truncate">{contactNumber || tRoster("notSet")}</span>
            </div>
          </div>
          <Link
            href={`/dashboard/teams/${teamId}/edit`}
            className="inline-flex items-center gap-1.5 text-[0.7rem] text-gold hover:text-gold-light"
          >
            <Pencil className="w-3 h-3" />
            {tRoster("editTelegramContact")}
          </Link>
        </div>
      </section>

      {/* Starting five */}
      <section className="space-y-3">
        <SectionLabel icon={UserRound} title={tRoster("startingLineupTitle")} />
        <div className="grid sm:grid-cols-2 gap-4">
          {starting.map((row) => (
            <RosterRowCard
              key={row.role}
              row={row}
              roleLabel={roleLabels[row.role]}
              onChange={(patch) => updateRow(row.role, patch)}
              onSetCaptain={() => setCaptain(row.role)}
              canBeCaptain
            />
          ))}
        </div>
      </section>

      {/* Substitutes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel icon={UserRound} title={tRoster("substitutes")} />
          <div className="flex gap-2">
            {!hasSub1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => addRow("SUB1")}
                className="h-8 px-3 text-xs text-gold hover:text-gold-light"
              >
                <Plus className="w-3.5 h-3.5" />
                {tRoster("addSub1")}
              </Button>
            )}
            {!hasSub2 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => addRow("SUB2")}
                className="h-8 px-3 text-xs text-gold hover:text-gold-light"
              >
                <Plus className="w-3.5 h-3.5" />
                {tRoster("addSub2")}
              </Button>
            )}
          </div>
        </div>
        {subs.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {subs.map((row) => (
              <RosterRowCard
                key={row.role}
                row={row}
                roleLabel={roleLabels[row.role]}
                onChange={(patch) => updateRow(row.role, patch)}
                onRemove={() => removeRow(row.role)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{tRoster("noSubstitutesAdded")}</p>
        )}
      </section>

      {/* Coach */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel icon={UserRound} title={tRoster("coach")} />
          {!hasCoach && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => addRow("COACH")}
              className="h-8 px-3 text-xs text-gold hover:text-gold-light"
            >
              <Plus className="w-3.5 h-3.5" />
              {tRoster("addCoach")}
            </Button>
          )}
        </div>
        {coach ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <RosterRowCard
              row={coach}
              roleLabel={roleLabels[coach.role]}
              onChange={(patch) => updateRow("COACH", patch)}
              onRemove={() => removeRow("COACH")}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{tRoster("coachOptional")}</p>
        )}
      </section>

      {errors.length > 0 && (
        <div className="ns-card rounded-lg border-destructive/40 p-4 space-y-1">
          {errors.map((e) => (
            <p key={e} className="text-sm text-destructive">
              {e}
            </p>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-gold/10">
        <Button onClick={handleSave} disabled={pending} className="ns-btn-gold h-11 px-6">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {pending ? tRoster("saving") : tRoster("saveRoster")}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-gold" />
      <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
        {title}
      </h3>
      <div className="flex-1 h-px bg-gradient-to-r from-gold/20 to-transparent" />
    </div>
  );
}

function ProgressStat({ label, value, max }: { label: string; value: number; max: number }) {
  const complete = value >= max;
  return (
    <span className={cn("font-medium", complete ? "text-gold" : "text-muted-foreground")}>
      {value}/{max} {label}
    </span>
  );
}

function RosterRowCard({
  row,
  roleLabel,
  onChange,
  onSetCaptain,
  onRemove,
  canBeCaptain,
}: {
  row: Row;
  roleLabel: string;
  onChange: (patch: Partial<Row>) => void;
  onSetCaptain?: () => void;
  onRemove?: () => void;
  canBeCaptain?: boolean;
}) {
  const t = useTranslations("dashboard.roster");
  return (
    <div
      className={cn(
        "ns-card rounded-xl p-4 space-y-3",
        row.is_captain && "border-gold/50 shadow-[0_0_20px_rgba(213,190,119,0.12)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-gold-light">
          {roleLabel}
        </span>
        <div className="flex items-center gap-2">
          {canBeCaptain && (
            <button
              type="button"
              onClick={onSetCaptain}
              className={cn(
                "flex items-center gap-1 text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded-md border transition-colors",
                row.is_captain
                  ? "text-gold border-gold/50 bg-gold/10"
                  : "text-muted-foreground border-white/10 hover:border-gold/30 hover:text-gold-light"
              )}
            >
              <Crown className="w-3 h-3" />
              {t("captain")}
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-white/40 hover:text-destructive transition-colors"
              aria-label={t("remove")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <ImageUpload
          useCase="playerAvatar"
          shape="circle"
          size={72}
          currentUrl={row.avatar_url}
          onUploaded={(url) => onChange({ avatar_url: url })}
        />
        <div className="flex-1 space-y-2.5">
          <div className="space-y-1">
            <Label className="text-[0.65rem] text-muted-foreground">
              {t("ignLabel")} <span className="text-gold">*</span>
            </Label>
            <Input
              value={row.player_name}
              onChange={(e) => onChange({ player_name: e.target.value })}
              placeholder={t("ignPlaceholder")}
              className="h-8 ns-input text-sm"
            />
            <p className="text-[0.65rem] text-muted-foreground">{t("ignHint")}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[0.65rem] text-muted-foreground">{t("gameIdLabel")}</Label>
            <Input
              value={row.game_id}
              onChange={(e) => onChange({ game_id: e.target.value })}
              placeholder="e.g. 123456789 (1234)"
              className="h-8 ns-input text-sm"
            />
            <p className="text-[0.65rem] text-muted-foreground">{t("gameIdHint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
