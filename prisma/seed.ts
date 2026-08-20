// NOBLE STRIKE — seed script entry point (run with `bun run db:seed`)
import { runSeed } from "../src/lib/seed";

async function main() {
  console.log("🌱 Seeding NOBLE STRIKE database…");
  const counts = await runSeed();
  console.log("✅ Seed complete. Final counts:");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(16)} ${v}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
