"use client";

import { create } from "zustand";
import type { NSView } from "./types";

interface AppState {
  view: NSView;
  selectedTournamentId: string | null;
  selectedTeamId: string | null;
  selectedNewsId: string | null;
  setView: (view: NSView) => void;
  goHome: () => void;
  openTournament: (id: string) => void;
  openTeam: (id: string) => void;
  openNews: (id: string) => void;
}

export const useApp = create<AppState>((set) => ({
  view: "home",
  selectedTournamentId: null,
  selectedTeamId: null,
  selectedNewsId: null,
  setView: (view) => {
    set({ view });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", `#/${view}`);
    }
  },
  goHome: () => set({ view: "home" }),
  openTournament: (id) => {
    set({ selectedTournamentId: id, view: "tournaments" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  openTeam: (id) => {
    set({ selectedTeamId: id, view: "teams" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  openNews: (id) => {
    set({ selectedNewsId: id, view: "news" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
}));

// Hash routing helpers
export function getViewFromHash(): NSView {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash.replace(/^#\/?/, "");
  const valid: NSView[] = ["home", "tournaments", "teams", "ns-team", "news", "brackets"];
  return (valid as string[]).includes(h) ? (h as NSView) : "home";
}
