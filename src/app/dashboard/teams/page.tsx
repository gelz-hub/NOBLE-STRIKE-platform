import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TeamCard } from "@/components/dashboard/team-card";
import { Button } from "@/components/ui/button";
import { Plus, Shield } from "lucide-react";

export default async function MyTeamsPage() {
  const t = await getTranslations("dashboard.team");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, logo_url, team_members(count), tournament_registrations(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("myTeamsTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("myTeamsSubtitle")}</p>
        </div>
        <Link href="/dashboard/teams/new">
          <Button className="ns-btn-gold h-10 px-4 text-xs uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            {t("createTeam")}
          </Button>
        </Link>
      </div>

      {teams && teams.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              id={team.id}
              teamName={team.team_name}
              logoUrl={team.logo_url}
              memberCount={team.team_members?.[0]?.count ?? 0}
              registrationCount={team.tournament_registrations?.[0]?.count ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Shield className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">{t("noTeamsYet")}</p>
          <Link href="/dashboard/teams/new">
            <Button className="ns-btn-gold h-10 px-5 text-xs uppercase tracking-wider mt-2">
              <Plus className="w-4 h-4" />
              {t("createFirstTeam")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
