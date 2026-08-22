import { getTranslations } from "next-intl/server";
import { TeamIdentityForm } from "@/components/dashboard/team-identity-form";
import { createTeam } from "../actions";

export default async function NewTeamPage() {
  const t = await getTranslations("dashboard.team");
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="ns-kicker mb-2">{t("stepOneOfTwo")}</p>
        <h1 className="font-display font-bold text-2xl text-white">{t("createTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("createSubtitle")}</p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <TeamIdentityForm action={createTeam} submitLabel={t("continueToRoster")} mode="create" />
      </div>
    </div>
  );
}
