import Link from "next/link";
import { cn } from "@/lib/utils";

export function PaginationLinks({
  page,
  totalPages,
  searchParams,
}: {
  page: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  function hrefFor(p: number) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter(([, v]) => v !== undefined) as [string, string][]
    );
    params.set("page", String(p));
    return `?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link
          key={p}
          href={hrefFor(p)}
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold border transition-colors",
            p === page
              ? "text-gold-light bg-gold/10 border-gold/40"
              : "text-white/60 border-white/10 hover:border-gold/30"
          )}
        >
          {p}
        </Link>
      ))}
    </div>
  );
}
