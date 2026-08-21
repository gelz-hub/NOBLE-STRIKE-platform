import { RegistrationsFilters } from "@/components/admin/registrations-filters";
import { RegistrationsList } from "@/components/admin/registrations-list";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { Inbox } from "lucide-react";
import { getTournamentRegistrations, type GetTournamentRegistrationsParams } from "./actions";

interface Props {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

const PAGE_SIZE = 15;

export default async function AdminRegistrationsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = (sp.status as GetTournamentRegistrationsParams["status"]) || undefined;

  const { rows, total } = await getTournamentRegistrations({
    status,
    search: sp.search,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Tournament Registrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, approve, or reject team registrations.
        </p>
      </div>

      <RegistrationsFilters />

      {rows.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Inbox className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">No registrations match these filters.</p>
        </div>
      ) : (
        <>
          <RegistrationsList rows={rows} />
          <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
        </>
      )}
    </div>
  );
}
