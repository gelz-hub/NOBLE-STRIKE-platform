import { countryCodeToFlag, getCountryByCode, UNKNOWN_FLAG } from "@/lib/countries";
import { cn } from "@/lib/utils";

/**
 * Renders a country's flag + name, or the 🌍 Unknown fallback when no code
 * is set. Used anywhere player/team country is shown (profiles, recruitment
 * cards, admin views) so the fallback and flag rendering stay consistent.
 */
export function CountryFlag({
  code,
  name,
  showName = true,
  unknownLabel = "Unknown",
  className,
}: {
  code?: string | null;
  name?: string | null;
  showName?: boolean;
  unknownLabel?: string;
  className?: string;
}) {
  const country = getCountryByCode(code);
  const flag = country ? countryCodeToFlag(country.code) : UNKNOWN_FLAG;
  const label = country?.name ?? name ?? unknownLabel;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span aria-hidden="true">{flag}</span>
      {showName && <span>{label}</span>}
    </span>
  );
}
