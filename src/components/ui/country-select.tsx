"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  COUNTRIES_FOR_PICKER,
  POPULAR_COUNTRY_CODES,
  countryCodeToFlag,
  getCountryByCode,
} from "@/lib/countries";

interface CountrySelectProps {
  value?: string | null;
  onChange: (code: string, name: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  className?: string;
  /** When set, renders a leading "clear" item (e.g. "All Countries") that calls onChange("", ""). Used by filters, not profile/post forms where a country is required. */
  allLabel?: string;
}

/** Searchable country combobox — popular Southeast Asian countries first, everything else alphabetical after. */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country",
  emptyText = "No country found.",
  searchPlaceholder = "Search countries...",
  className,
  allLabel,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const selected = getCountryByCode(value);
  const popular = COUNTRIES_FOR_PICKER.filter((c) => POPULAR_COUNTRY_CODES.includes(c.code));
  const rest = COUNTRIES_FOR_PICKER.filter((c) => !POPULAR_COUNTRY_CODES.includes(c.code));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("ns-input w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span aria-hidden="true">{countryCodeToFlag(selected.code)}</span>
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-gold/30">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            {allLabel && (
              <CommandGroup>
                <CommandItem
                  value={allLabel}
                  onSelect={() => {
                    onChange("", "");
                    setOpen(false);
                  }}
                >
                  {allLabel}
                  <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {popular.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.code, country.name);
                    setOpen(false);
                  }}
                >
                  <span className="mr-2" aria-hidden="true">
                    {countryCodeToFlag(country.code)}
                  </span>
                  {country.name}
                  <Check
                    className={cn("ml-auto h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              {rest.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange(country.code, country.name);
                    setOpen(false);
                  }}
                >
                  <span className="mr-2" aria-hidden="true">
                    {countryCodeToFlag(country.code)}
                  </span>
                  {country.name}
                  <Check
                    className={cn("ml-auto h-4 w-4", value === country.code ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
