// Dev-only seed script — inserts 2 sample tournaments for testing the
// Phase 4 registration workflow, since admin Tournament Management (create/
// edit) hasn't been built yet. Only ever run manually from the CLI:
//
//   node scripts/seed-tournaments.mjs
//
// Never imported from src/app — there is no UI or API route that triggers
// this. Uses the service-role key (server-only, .env.local), and only
// inserts if the tournaments table is currently empty.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envText = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const env = {};
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const SEED_TOURNAMENTS = [
  {
    title: "NS Season 1 Championship",
    slug: "ns-season-1-championship",
    description:
      "The inaugural NOBLE STRIKE championship — 128 teams, single elimination, fighting for the throne.",
    game_type: "MLBB",
    max_teams: 128,
    prize_pool: 5000,
    registration_deadline: daysFromNow(14),
    start_date: daysFromNow(21),
    status: "REGISTRATION_OPEN",
    format: "BO3",
  },
  {
    title: "NS Honor Cup",
    slug: "ns-honor-cup",
    description: "NOBLE STRIKE's premier Honor of Kings tournament, open to 64 elite squads.",
    game_type: "HOK",
    max_teams: 64,
    prize_pool: 2500,
    registration_deadline: daysFromNow(14),
    start_date: daysFromNow(21),
    status: "REGISTRATION_OPEN",
    format: "BO3",
  },
];

async function main() {
  const { count, error: countError } = await supabase
    .from("tournaments")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error("Failed to check tournaments table:", countError.message);
    process.exit(1);
  }

  if ((count ?? 0) > 0) {
    console.log(`tournaments table already has ${count} row(s) — skipping seed.`);
    return;
  }

  const { data, error } = await supabase.from("tournaments").insert(SEED_TOURNAMENTS).select("id, title");
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  console.log(`Seeded ${data.length} tournament(s):`);
  for (const t of data) console.log(`  - ${t.title} (${t.id})`);
}

main();
