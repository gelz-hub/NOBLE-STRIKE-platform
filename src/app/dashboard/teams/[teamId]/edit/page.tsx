import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TeamIdentityForm } from "@/components/dashboard/team-identity-form";
import { DeleteTeamButton } from "@/components/dashboard/delete-team-button";
import { Button } from "@/components/ui/button";
import { Users2 } from "lucide-react";
import { updateTeam } from "../../actions";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function EditTeamPage({ params }: Props) {
  const { teamId } = await params;
  const t = await getTranslations("dashboard.team");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/teams/${teamId}/edit`);

  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).single();
  if (!team) notFound();
  if (team.owner_id !== user.id) redirect("/dashboard/teams");

  const boundUpdateTeam = updateTeam.bind(null, teamId);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">
            {t("editTitle", { teamName: team.team_name })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("editSubtitle")}</p>
        </div>
        <Link href={`/dashboard/teams/${teamId}/roster`}>
          <Button className="ns-btn-outline h-10 px-4 text-xs uppercase tracking-wider">
            <Users2 className="w-3.5 h-3.5" />
            {t("editRoster")}
          </Button>
        </Link>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <TeamIdentityForm
          action={boundUpdateTeam}
          initial={{
            team_name: team.team_name,
            logo_url: team.logo_url,
            banner_url: team.banner_url,
            description: team.description,
            game: team.game,
            contact_number: team.contact_number,
            captain_telegram: team.captain_telegram,
            province: team.province,
          }}
          submitLabel={t("saveChanges")}
          mode="edit"
        />
      </div>

      <div className="ns-card rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{t("dangerZone")}</p>
          <p className="text-xs text-muted-foreground">{t("dangerZoneHint")}</p>
        </div>
        <DeleteTeamButton teamId={teamId} teamName={team.team_name} />
      </div>
    </div>
  );
}
