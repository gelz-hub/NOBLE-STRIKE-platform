"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { useHashView } from "./hooks";
import { NavBar } from "./nav";
import { Footer } from "./footer";
import { HomeView } from "./views/home-view";
import { TournamentsView } from "./views/tournaments-view";
import { TeamsView } from "./views/teams-view";
import { NSTeamView } from "./views/ns-team-view";
import { NewsView } from "./views/news-view";
import { BracketsView } from "./views/brackets-view";
import { AdminView } from "./views/admin-view";
import type { NSView } from "@/lib/types";

const VIEWS: Record<NSView, React.ComponentType> = {
  home: HomeView,
  tournaments: TournamentsView,
  teams: TeamsView,
  "ns-team": NSTeamView,
  news: NewsView,
  brackets: BracketsView,
  admin: AdminView,
};

export function AppShell() {
  const view = useApp((s) => s.view);
  useHashView();

  // listen for global reload events
  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener("ns-reload", handler);
    return () => window.removeEventListener("ns-reload", handler);
  }, []);

  const View = VIEWS[view] || HomeView;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <NavBar />
      <main className="flex-1">
        <View />
      </main>
      <Footer />
    </div>
  );
}
