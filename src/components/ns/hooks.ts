"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import type { NSView } from "@/lib/types";

/** Generic data fetcher with loading/error state.
 *  Data is tagged with the url it belongs to so stale results from a previous
 *  url are never surfaced. Loading is derived (no setState-in-effect). */
export function useFetch<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!url) return;
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      try {
        const r = await fetch(url, { signal: controller.signal });
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        const json = await r.json();
        if (!active) return;
        setData(json);
        setDataUrl(url);
        setError(null);
      } catch (e) {
        if (!active || controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    };
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [url, reloadKey, ...deps]);

  // Only surface data if it belongs to the currently requested url.
  // Loading is true while we have a url but no matching data and no error yet.
  const safeData = dataUrl === url ? data : null;
  const loading = url !== null && dataUrl !== url && error === null;
  return { data: safeData, loading, error, reload };
}

/** Hash-based view sync with the global store */
export function useHashView() {
  const view = useApp((s) => s.view);

  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace(/^#\/?/, "");
      const valid: NSView[] = ["home", "tournaments", "teams", "ns-team", "news", "brackets"];
      if ((valid as string[]).includes(h) && h !== view) {
        useApp.setState({ view: h as NSView });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [view]);
}

export async function apiPost<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (json as { error?: string })?.error || `Request failed (${res.status})`
    );
  return json as T;
}

export async function apiPut<T = unknown>(
  url: string,
  body: unknown
): Promise<T> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (json as { error?: string })?.error || `Request failed (${res.status})`
    );
  return json as T;
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (json as { error?: string })?.error || `Request failed (${res.status})`
    );
  return json as T;
}
