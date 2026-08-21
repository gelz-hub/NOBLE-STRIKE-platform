"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { Crown, Loader2, Plus, Save, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { rosterSchema, REQUIRED_ROLES, type RosterMemberInput } from "@/lib/validation/team";
import type { RosterRole, TeamMember } from "@/lib/types/database";
import { saveRoster } from "@/app/dashboard/teams/actions";

interface TeamRosterFormProps {
  teamId: string;
  initialMembers: TeamMember[];
}

type Row = RosterMemberInput;

const ROLE_LABELS: Record<RosterRole, string> = {
  EXP: "Exp Laner",
  JUNGLE: "Jungler",
  MID: "Mid Laner",
  GOLD: "Gold Laner",
  ROAM: "Roamer",
  SUB1: "Substitute 1",
  SUB2: "Substitute 2",
  COACH: "Coach",
};

function emptyRow(role: RosterRole): Row {
  return {
    role,
    player_name: "",
    game_id: "",
    country: "",
    discord: "",
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
          country: existing.country ?? "",
          discord: existing.discord ?? "",
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
        country: existing.country ?? "",
        discord: existing.discord ?? "",
        avatar_url: existing.avatar_url ?? "",
        is_captain: false,
      });
    }
  }
  return rows;
}

export function TeamRosterForm({ teamId, initialMembers }: TeamRosterFormProps) {
  const [rows, setRows] = useState<Row[]>(() => buildInitialRows(initialMembers));
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();

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
      const messages = [...new Set(parsed.error.issues.map((i) => i.message))];
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
      toast.success("Roster saved.");
      router.push(`/teams/${teamId}`);
    });
  }

  const starting = rows.filter((r) => (REQUIRED_ROLES as readonly string[]).includes(r.role));
  const subs = rows.filter((r) => r.role === "SUB1" || r.role === "SUB2");
  const coach = rows.find((r) => r.role === "COACH");
  const captainRow = rows.find((r) => r.is_captain);

  return (
    <div className="space-y-8">
      {/* Captain summary */}
      <section className="space-y-3">
        <SectionLabel icon={Crown} title="Captain" />
        <div className="ns-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
            <Crown className="w-4 h-4 text-gold" />
          </div>
          <p className="text-white font-medium">
            {captainRow?.player_name || "No captain selected yet"}
          </p>
        </div>
      </section>

      {/* Starting five */}
      <section className="space-y-3">
        <SectionLabel icon={UserRound} title="Starting Lineup" />
        <div className="grid sm:grid-cols-2 gap-4">
          {starting.map((row) => (
            <RosterRowCard
              key={row.role}
              row={row}
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
          <SectionLabel icon={UserRound} title="Substitutes" />
          <div className="flex gap-2">
            {!hasSub1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => addRow("SUB1")}
                className="h-8 px-3 text-xs text-gold hover:text-gold-light"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Sub 1
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
                Add Sub 2
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
                onChange={(patch) => updateRow(row.role, patch)}
                onRemove={() => removeRow(row.role)}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No substitutes added.</p>
        )}
      </section>

      {/* Coach */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionLabel icon={UserRound} title="Coach" />
          {!hasCoach && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => addRow("COACH")}
              className="h-8 px-3 text-xs text-gold hover:text-gold-light"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Coach
            </Button>
          )}
        </div>
        {coach ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <RosterRowCard
              row={coach}
              onChange={(patch) => updateRow("COACH", patch)}
              onRemove={() => removeRow("COACH")}
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Optional — no coach added.</p>
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
          {pending ? "Saving..." : "Save Roster"}
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

function RosterRowCard({
  row,
  onChange,
  onSetCaptain,
  onRemove,
  canBeCaptain,
}: {
  row: Row;
  onChange: (patch: Partial<Row>) => void;
  onSetCaptain?: () => void;
  onRemove?: () => void;
  canBeCaptain?: boolean;
}) {
  return (
    <div
      className={cn(
        "ns-card rounded-xl p-4 space-y-3",
        row.is_captain && "border-gold/50 shadow-[0_0_20px_rgba(213,190,119,0.12)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-heading font-bold uppercase tracking-wider text-gold-light">
          {ROLE_LABELS[row.role]}
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
              Captain
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-white/40 hover:text-destructive transition-colors"
              aria-label="Remove"
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
              Player Name <span className="text-gold">*</span>
            </Label>
            <Input
              value={row.player_name}
              onChange={(e) => onChange({ player_name: e.target.value })}
              placeholder="In-game name"
              className="h-8 ns-input text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[0.65rem] text-muted-foreground">Game ID</Label>
            <Input
              value={row.game_id}
              onChange={(e) => onChange({ game_id: e.target.value })}
              placeholder="e.g. 123456789 (1234)"
              className="h-8 ns-input text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-[0.65rem] text-muted-foreground">Country</Label>
          <Input
            value={row.country}
            onChange={(e) => onChange({ country: e.target.value })}
            placeholder="e.g. PH"
            className="h-8 ns-input text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[0.65rem] text-muted-foreground">Discord</Label>
          <Input
            value={row.discord}
            onChange={(e) => onChange({ discord: e.target.value })}
            placeholder="username"
            className="h-8 ns-input text-sm"
          />
        </div>
      </div>
    </div>
  );
}
