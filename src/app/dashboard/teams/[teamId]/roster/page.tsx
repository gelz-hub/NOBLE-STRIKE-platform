import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TeamRosterForm } from "@/components/dashboard/team-roster-form";
import type { TeamMember } from "@/lib/types/database";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function TeamRosterPage({ params }: Props) {
  const { teamId } = await params;
  const t = await getTranslations("dashboard.team");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/dashboard/teams/${teamId}/roster`);

  const { data: team } = await supabase
    .from("teams")
    .select("id, team_name, owner_id, game, contact_number, captain_telegram")
    .eq("id", teamId)
    .single();
  if (!team) notFound();
  if (team.owner_id !== user.id) redirect("/dashboard/teams");

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", teamId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="ns-kicker mb-2">{t("stepTwoOfTwo")}</p>
        <h1 className="font-display font-bold text-2xl text-white">
          {t("buildRosterTitle", { teamName: team.team_name })}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("buildRosterSubtitle")}</p>
      </div>

      <TeamRosterForm
        teamId={teamId}
        game={team.game}
        contactNumber={team.contact_number}
        captainTelegram={team.captain_telegram}
        initialMembers={(members ?? []) as TeamMember[]}
      />
    </div>
  );
}
