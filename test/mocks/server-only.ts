// Vitest alias target for the "server-only" package (see vitest.config.ts).
// The real package throws when imported outside the Next.js server runtime,
// which is exactly what happens when a Vitest test imports src/lib/bracket/*
// directly — the package itself documents that this is a build-time-only
// guard, not something tests are expected to satisfy. Aliasing it to this
// empty no-op module (instead of stripping the import from source files) is
// the standard approach and keeps production source untouched.
export {};
