import { getPendingReports, getFlaggedAccounts } from "./actions";
import { ReportReviewRow } from "@/components/admin/report-review-row";
import { FlaggedAccountRow } from "@/components/admin/flagged-account-row";
import { Flag, ShieldAlert } from "lucide-react";

export default async function AdminModerationPage() {
  const [reports, flaggedAccounts] = await Promise.all([getPendingReports(), getFlaggedAccounts()]);
  const pending = reports.filter((r) => r.status === "PENDING");
  const resolved = reports.filter((r) => r.status !== "PENDING").slice(0, 20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Moderation</h1>
        <p className="text-sm text-muted-foreground mt-1">Review reports and manage flagged accounts.</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <Flag className="w-4 h-4 text-gold" />
          <h2 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
            Pending Reports ({pending.length})
          </h2>
        </div>
        {pending.length === 0 ? (
          <div className="ns-card rounded-xl p-8 text-center text-white/60 text-sm">No pending reports.</div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <ReportReviewRow key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-gold" />
          <h2 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
            Flagged Accounts ({flaggedAccounts.length})
          </h2>
        </div>
        {flaggedAccounts.length === 0 ? (
          <div className="ns-card rounded-xl p-8 text-center text-white/60 text-sm">No flagged accounts.</div>
        ) : (
          <div className="space-y-2">
            {flaggedAccounts.map((a) => (
              <FlaggedAccountRow key={a.id} account={a} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading font-semibold uppercase text-sm tracking-wider text-white">
            Recently Resolved
          </h2>
          <div className="space-y-2">
            {resolved.map((r) => (
              <ReportReviewRow key={r.id} report={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
