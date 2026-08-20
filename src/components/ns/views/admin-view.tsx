"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { useFetch, apiPost, apiPut, apiDelete } from "../hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Shield,
  Lock,
  Trophy,
  Users,
  Newspaper,
  Swords,
  LayoutDashboard,
  Plus,
  Check,
  X,
  Trash2,
  Zap,
  RefreshCw,
  Loader2,
  Crown,
  Database,
  LogOut,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tournament, Team, Announcement } from "@/lib/types";

const ADMIN_PASSWORD = "noblestrike";

export function AdminView() {
  const unlocked = useApp((s) => s.adminUnlocked);
  const unlock = useApp((s) => s.unlockAdmin);
  const lock = useApp((s) => s.lockAdmin);
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try {
      const res = await apiPost<{ ok?: boolean; error?: string }>(
        "/api/admin/login",
        { password }
      );
      if (res.ok) {
        unlock();
        toast.success("Admin access granted");
      } else {
        toast.error(res.error || "Invalid password");
      }
    } catch (err) {
      // fallback to local check
      if (password === ADMIN_PASSWORD) {
        unlock();
        toast.success("Admin access granted");
      } else {
        toast.error(err instanceof Error ? err.message : "Invalid password");
      }
    } finally {
      setChecking(false);
    }
  };

  if (!unlocked) {
    return (
      <div className="pt-24 md:pt-28 pb-20 min-h-[80vh] flex items-center justify-center ns-fade-up">
        <div className="mx-auto max-w-md w-full px-4">
          <div className="ns-card ns-card-gold-edge rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/40 mb-4">
                <Lock className="w-8 h-8 text-gold" />
              </div>
              <h1 className="font-display font-black text-2xl text-white">
                Admin Access
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Protected control center. Authorized personnel only.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Admin Password
                </Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="bg-black/40 border-gold/20 focus:border-gold/60 h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={checking}
                className="ns-btn-gold w-full h-11"
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4" />
                )}
                Unlock Dashboard
              </Button>
              <p className="text-center text-[0.7rem] text-muted-foreground">
                Demo password: <span className="text-gold-light font-mono">noblestrike</span>
              </p>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/40 flex items-center justify-center">
              <Shield className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="font-display font-black text-2xl md:text-3xl text-white">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage tournaments, teams, news &amp; brackets.
              </p>
            </div>
          </div>
          <Button
            onClick={lock}
            variant="outline"
            className="border-gold/30 text-white/70 hover:text-gold-light hover:border-gold/60 h-10"
          >
            <LogOut className="w-4 h-4" />
            Lock
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="bg-black/40 border border-gold/15 p-1 h-auto flex flex-wrap gap-1">
            <TabTrigger icon={LayoutDashboard} label="Overview" value="overview" />
            <TabTrigger icon={Trophy} label="Tournaments" value="tournaments" />
            <TabTrigger icon={Users} label="Teams" value="teams" />
            <TabTrigger icon={Newspaper} label="News" value="news" />
            <TabTrigger icon={Swords} label="Brackets" value="brackets" />
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="tournaments" className="mt-6">
            <TournamentsTab />
          </TabsContent>
          <TabsContent value="teams" className="mt-6">
            <TeamsTab />
          </TabsContent>
          <TabsContent value="news" className="mt-6">
            <NewsTab />
          </TabsContent>
          <TabsContent value="brackets" className="mt-6">
            <BracketsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function TabTrigger({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold-light text-white/60 data-[state=active]:shadow-none gap-2 rounded-md px-4 py-2 text-xs font-heading font-semibold uppercase tracking-wider"
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </TabsTrigger>
  );
}

/* ============ OVERVIEW ============ */
function OverviewTab() {
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");
  const { data: teams } = useFetch<Team[]>("/api/teams?status=PENDING");
  const { data: news } = useFetch<Announcement[]>("/api/news");

  const reseed = async () => {
    if (!confirm("Reload demo data? This wipes & re-seeds the database.")) return;
    try {
      await apiPost("/api/admin/seed", {});
      toast.success("Demo data reloaded");
      window.location.reload();
    } catch (e) {
      toast.error("Seed failed");
    }
  };

  const stats = [
    { icon: Trophy, label: "Tournaments", value: tournaments?.length ?? 0, color: "text-gold" },
    { icon: Users, label: "Pending Teams", value: teams?.length ?? 0, color: "text-yellow-400" },
    { icon: Newspaper, label: "Articles", value: news?.length ?? 0, color: "text-cyan-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="ns-card ns-card-gold-edge rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center">
              <s.icon className={cn("w-6 h-6", s.color)} />
            </div>
            <div>
              <div className="font-display font-black text-3xl text-white">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ns-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-gold" />
          <h3 className="font-display font-bold text-lg text-white">Quick Actions</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={reseed} variant="outline" className="border-gold/30 hover:border-gold/60">
            <RefreshCw className="w-4 h-4" />
            Reload Demo Data
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Use the tabs above to create tournaments, approve teams, publish news, and generate brackets.
        </p>
      </div>
    </div>
  );
}

/* ============ TOURNAMENTS TAB ============ */
function TournamentsTab() {
  const { data: tournaments, loading, reload } = useFetch<Tournament[]>("/api/tournaments");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    game: "MLBB",
    startDate: "",
    registrationDeadline: "",
    teamLimit: 8,
    prizePool: "",
    rules: "",
    format: "BO3",
    description: "",
    location: "Online",
    organizer: "NOBLE STRIKE",
    bannerImage: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.startDate || !form.prizePool) {
      toast.error("Name, start date, and prize pool are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/tournaments", {
        ...form,
        teamLimit: Number(form.teamLimit),
        bannerImage: form.bannerImage || null,
      });
      toast.success("Tournament created");
      setCreating(false);
      setForm({
        name: "",
        game: "MLBB",
        startDate: "",
        registrationDeadline: "",
        teamLimit: 8,
        prizePool: "",
        rules: "",
        format: "BO3",
        description: "",
        location: "Online",
        organizer: "NOBLE STRIKE",
        bannerImage: "",
      });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this tournament?")) return;
    try {
      await apiDelete(`/api/tournaments/${id}`);
      toast.success("Deleted");
      reload();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const cycleStatus = async (t: Tournament) => {
    const order = ["REGISTRATION_OPEN", "REGISTRATION_CLOSED", "ONGOING", "COMPLETED"];
    const next = order[(order.indexOf(t.status) + 1) % order.length];
    try {
      await apiPut(`/api/tournaments/${t.id}`, { status: next });
      toast.success(`Status → ${next.replace(/_/g, " ")}`);
      reload();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-xl text-white">All Tournaments</h3>
        <Button onClick={() => setCreating((v) => !v)} className="ns-btn-gold h-10">
          <Plus className="w-4 h-4" />
          {creating ? "Cancel" : "Create Tournament"}
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="ns-card ns-card-gold-edge rounded-xl p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <AdminField label="Tournament Name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-black/40 border-gold/20" placeholder="NS Championship 2025" />
            </AdminField>
            <AdminField label="Game">
              <Select value={form.game} onValueChange={(v) => set("game", v)}>
                <SelectTrigger className="bg-black/40 border-gold/20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d0d0d] border-gold/30">
                  <SelectItem value="MLBB">Mobile Legends: Bang Bang</SelectItem>
                  <SelectItem value="HOK">Honor of Kings</SelectItem>
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label="Start Date">
              <Input type="datetime-local" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
            <AdminField label="Registration Deadline">
              <Input type="datetime-local" value={form.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
            <AdminField label="Team Limit">
              <Input type="number" value={form.teamLimit} onChange={(e) => set("teamLimit", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
            <AdminField label="Prize Pool">
              <Input value={form.prizePool} onChange={(e) => set("prizePool", e.target.value)} className="bg-black/40 border-gold/20" placeholder="$50,000" />
            </AdminField>
            <AdminField label="Format">
              <Select value={form.format} onValueChange={(v) => set("format", v)}>
                <SelectTrigger className="bg-black/40 border-gold/20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d0d0d] border-gold/30">
                  <SelectItem value="BO1">Best of 1</SelectItem>
                  <SelectItem value="BO3">Best of 3</SelectItem>
                  <SelectItem value="BO5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label="Location">
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
            <AdminField label="Banner Image URL" full>
              <Input value={form.bannerImage} onChange={(e) => set("bannerImage", e.target.value)} className="bg-black/40 border-gold/20" placeholder="https://..." />
            </AdminField>
            <AdminField label="Description" full>
              <Input value={form.description} onChange={(e) => set("description", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
            <AdminField label="Rules" full>
              <Textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} className="bg-black/40 border-gold/20 min-h-[100px]" placeholder="Tournament rules and regulations..." />
            </AdminField>
          </div>
          <Button type="submit" disabled={submitting} className="ns-btn-gold h-11">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Create Tournament
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
        ) : (tournaments || []).length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No tournaments yet.</p>
        ) : (
          (tournaments || []).map((t) => (
            <div key={t.id} className="ns-card rounded-xl p-4 flex items-center gap-4">
              <Trophy className="w-5 h-5 text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-white truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.game} · {t.format} · {t.prizePool} · {t._count?.teams ?? 0}/{t.teamLimit} teams</p>
              </div>
              <button
                onClick={() => cycleStatus(t)}
                className={cn(
                  "ns-pill",
                  t.status === "REGISTRATION_OPEN" ? "ns-pill-open" :
                  t.status === "ONGOING" ? "ns-pill-ongoing" :
                  t.status === "COMPLETED" ? "ns-pill-completed" : "ns-pill-closed"
                )}
              >
                {t.status.replace(/_/g, " ")}
              </button>
              <button onClick={() => remove(t.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-red-400/70 hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============ TEAMS TAB ============ */
function TeamsTab() {
  const { data: teams, loading, reload } = useFetch<Team[]>("/api/teams?status=PENDING");
  const [filter, setFilter] = useState("PENDING");

  const { data: allTeams } = useFetch<Team[]>("/api/teams");
  const list = filter === "PENDING" ? (teams || []) : (allTeams || []).filter((t) => t.status === filter);

  const setStatus = async (team: Team, status: string) => {
    try {
      await apiPut(`/api/teams/${team.id}`, { status });
      toast.success(`${team.name} → ${status}`);
      reload();
      // force refetch all
      window.dispatchEvent(new Event("ns-reload"));
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display font-bold text-xl text-white">Team Approvals</h3>
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider border",
                filter === f ? "bg-gold/15 border-gold/50 text-gold-light" : "border-gold/15 text-white/60 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
        ) : list.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No {filter.toLowerCase()} teams.</p>
        ) : (
          list.map((t) => (
            <div key={t.id} className="ns-card rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#E6D69A] to-[#92783D] flex items-center justify-center font-display font-bold text-black">
                  {t.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold text-white truncate">{t.name}</p>
                    {t.isOfficial && <Crown className="w-3.5 h-3.5 text-gold" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.game} · Captain: {t.captainName} · @{t.discordUsername}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "PENDING" ? (
                    <>
                      <button onClick={() => setStatus(t, "APPROVED")} className="w-8 h-8 rounded-md flex items-center justify-center bg-green-400/10 text-green-400 hover:bg-green-400/20" title="Approve">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setStatus(t, "REJECTED")} className="w-8 h-8 rounded-md flex items-center justify-center bg-red-400/10 text-red-400 hover:bg-red-400/20" title="Reject">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className={cn("ns-pill", t.status === "APPROVED" ? "ns-pill-approved" : "ns-pill-rejected")}>
                      {t.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {[t.player1, t.player2, t.player3, t.player4, t.player5, t.substitute].filter(Boolean).map((p, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white/5 border border-gold/10">{p}</span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============ NEWS TAB ============ */
function NewsTab() {
  const { data: news, loading, reload } = useFetch<Announcement[]>("/api/news");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    excerpt: "",
    category: "ANNOUNCEMENTS",
    featured: false,
    coverImage: "",
    author: "NOBLE STRIKE",
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.content) {
      toast.error("Title and content are required.");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost("/api/news", { ...form, coverImage: form.coverImage || null });
      toast.success("Article published");
      setCreating(false);
      setForm({ title: "", content: "", excerpt: "", category: "ANNOUNCEMENTS", featured: false, coverImage: "", author: "NOBLE STRIKE" });
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this article?")) return;
    try {
      await apiDelete(`/api/news/${id}`);
      toast.success("Deleted");
      reload();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-xl text-white">Newsroom</h3>
        <Button onClick={() => setCreating((v) => !v)} className="ns-btn-gold h-10">
          <Plus className="w-4 h-4" />
          {creating ? "Cancel" : "New Article"}
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="ns-card ns-card-gold-edge rounded-xl p-6 space-y-4">
          <AdminField label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} className="bg-black/40 border-gold/20" placeholder="Article title" />
          </AdminField>
          <div className="grid sm:grid-cols-2 gap-4">
            <AdminField label="Category">
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger className="bg-black/40 border-gold/20"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0d0d0d] border-gold/30">
                  <SelectItem value="TOURNAMENT_NEWS">Tournament News</SelectItem>
                  <SelectItem value="TEAM_UPDATES">Team Updates</SelectItem>
                  <SelectItem value="PLAYER_SIGNINGS">Player Signings</SelectItem>
                  <SelectItem value="RESULTS">Results</SelectItem>
                  <SelectItem value="ANNOUNCEMENTS">Announcements</SelectItem>
                </SelectContent>
              </Select>
            </AdminField>
            <AdminField label="Author">
              <Input value={form.author} onChange={(e) => set("author", e.target.value)} className="bg-black/40 border-gold/20" />
            </AdminField>
          </div>
          <AdminField label="Excerpt">
            <Input value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="bg-black/40 border-gold/20" placeholder="Short summary..." />
          </AdminField>
          <AdminField label="Content">
            <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} className="bg-black/40 border-gold/20 min-h-[160px]" placeholder="Full article content..." />
          </AdminField>
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 accent-[#D5BE77]" />
            Mark as featured article
          </label>
          <Button type="submit" disabled={submitting} className="ns-btn-gold h-11">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Publish Article
          </Button>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gold mx-auto" /></div>
        ) : (news || []).length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">No articles yet.</p>
        ) : (
          (news || []).map((n) => (
            <div key={n.id} className="ns-card rounded-xl p-4 flex items-center gap-4">
              <Newspaper className="w-5 h-5 text-gold shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-heading font-semibold text-white truncate">{n.title}</p>
                  {n.featured && <Crown className="w-3.5 h-3.5 text-gold" />}
                </div>
                <p className="text-xs text-muted-foreground">{n.category.replace(/_/g, " ")} · {new Date(n.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => remove(n.id)} className="w-8 h-8 rounded-md flex items-center justify-center text-red-400/70 hover:text-red-400 hover:bg-red-400/10">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============ BRACKETS TAB ============ */
function BracketsTab() {
  const { data: tournaments } = useFetch<Tournament[]>("/api/tournaments");
  const [selected, setSelected] = useState("");
  const [generating, setGenerating] = useState(false);

  const eligible = (tournaments || []).filter((t) => t.status === "ONGOING" || t.status === "REGISTRATION_CLOSED" || t.status === "REGISTRATION_OPEN");

  const generate = async () => {
    if (!selected) {
      toast.error("Select a tournament first");
      return;
    }
    setGenerating(true);
    try {
      const res = await apiPost<{ error?: string; teamCount?: number }>(`/api/tournaments/${selected}/bracket`, {});
      if ((res as { error?: string }).error) {
        toast.error((res as { error?: string }).error!);
      } else {
        toast.success(`Bracket generated for ${res.teamCount} teams`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display font-bold text-xl text-white">Bracket Management</h3>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Swords className="w-5 h-5 text-gold" />
          <h4 className="font-heading font-semibold text-white">Generate Single-Elimination Bracket</h4>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select a tournament and auto-generate a randomized single-elimination bracket from its approved teams.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="bg-black/40 border-gold/20 flex-1">
              <SelectValue placeholder="Select tournament..." />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d0d] border-gold/30">
              {eligible.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name} ({t._count?.teams ?? 0} teams)</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generate} disabled={generating} className="ns-btn-gold h-10 min-w-[180px]">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Generate Bracket
          </Button>
        </div>
      </div>

      <div className="ns-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Eye className="w-5 h-5 text-gold" />
          <h4 className="font-heading font-semibold text-white">Manage Match Results</h4>
        </div>
        <p className="text-sm text-muted-foreground">
          Visit the{" "}
          <button onClick={() => useApp.getState().setView("brackets")} className="text-gold-light underline">
            Brackets page
          </button>{" "}
          to enter scores &amp; advance winners in real time. Click any pending match to edit its score.
        </p>
      </div>
    </div>
  );
}

function AdminField({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "sm:col-span-2 space-y-1.5" : "space-y-1.5"}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
