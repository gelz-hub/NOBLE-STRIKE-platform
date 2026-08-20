// NOBLE STRIKE — shared seed logic used by both `prisma/seed.ts` and
// the /api/admin/seed route so the frontend "load demo data" button can
// trigger a re-seed without restarting the server.
//
// Tournament-centric architecture: teams participate in MULTIPLE tournaments
// via the Registration table (source of truth). `Team.tournamentId` is kept
// only as an optional "primary tournament" pointer for backward compatibility.
import { db } from "@/lib/db";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Create an APPROVED team with a 5-player roster + optional sub.
async function createTeam(opts: {
  name: string;
  tag: string;
  game: string;
  captainName: string;
  players: [string, string, string, string, string];
  sub?: string | null;
  region: string;
  description?: string;
  primaryTournamentId?: string | null;
  isOfficial?: boolean;
  status?: string;
}) {
  return db.team.create({
    data: {
      name: opts.name,
      logo: null,
      captainName: opts.captainName,
      discordUsername: `${opts.captainName.toLowerCase()}#${1000 + Math.floor(Math.random() * 8999)}`,
      contactNumber: `+1-555-${Math.floor(1000 + Math.random() * 8999)}`,
      game: opts.game,
      tournamentId: opts.primaryTournamentId ?? null,
      status: opts.status ?? "APPROVED",
      isOfficial: opts.isOfficial ?? false,
      player1: opts.players[0],
      player2: opts.players[1],
      player3: opts.players[2],
      player4: opts.players[3],
      player5: opts.players[4],
      substitute: opts.sub ?? null,
      region: opts.region,
      tag: opts.tag,
      description: opts.description ?? null,
    },
  });
}

// Create an APPROVED registration linking a team to a tournament.
async function register(teamId: string, tournamentId: string, status: string = "APPROVED") {
  return db.registration.create({
    data: { teamId, tournamentId, status },
  });
}

export async function runSeed() {
  // 1. Wipe everything in dependency order
  await db.match.deleteMany();
  await db.registration.deleteMany();
  await db.achievement.deleteMany();
  await db.announcement.deleteMany();
  await db.nSMember.deleteMany();
  await db.sponsor.deleteMany();
  await db.socialLink.deleteMany();
  await db.team.deleteMany();
  await db.tournament.deleteMany();
  await db.user.deleteMany();

  const now = new Date();
  const inDays = (d: number) => new Date(now.getTime() + d * 86400000);

  // 2. Create 5 tournaments (tournament-centric — scalable bracket sizes)
  const nsChampionship = await db.tournament.create({
    data: {
      name: "NS Season 1 Championship",
      game: "MLBB",
      slug: "ns-season-1-championship-ns1c",
      startDate: inDays(14),
      registrationDeadline: inDays(2),
      teamLimit: 128,
      prizePool: "$50,000",
      rules:
        "Single elimination. BO3 round of 8, quarterfinals and semifinals. BO5 grand final. Standard MPL ruleset. All players must be 18+. Roster lock 24h before kickoff. Up to 128 teams may register; top 8 advance to the live bracket based on qualifier standings.",
      bannerImage: null,
      status: "ONGOING",
      format: "BO3",
      description:
        "The flagship NOBLE STRIKE Season 1 invitational — 8 elite MLBB rosters battle across three days for a $50,000 prize pool and the NS trophy.",
      location: "Singapore Arena",
      organizer: "NOBLE STRIKE Esports",
      featured: true,
    },
  });

  const nsSummerCup = await db.tournament.create({
    data: {
      name: "NS Summer Cup 2025",
      game: "MLBB",
      slug: "ns-summer-cup-2025-nsc25",
      startDate: inDays(30),
      registrationDeadline: inDays(20),
      teamLimit: 64,
      prizePool: "$25,000",
      rules:
        "Single elimination. BO3 throughout. Open registration to all approved MLBB rosters. Seeds awarded on a first-come first-served basis once rosters are approved.",
      bannerImage: null,
      status: "REGISTRATION_OPEN",
      format: "BO3",
      description:
        "Summer edition open cup — 64 MLBB teams, single elimination, $25,000 prize pool.",
      location: "Online — SEA Server",
      organizer: "NOBLE STRIKE Esports",
      featured: true,
    },
  });

  const goldenArena = await db.tournament.create({
    data: {
      name: "Golden Arena Open",
      game: "MLBB",
      slug: "golden-arena-open-ga25",
      startDate: inDays(45),
      registrationDeadline: inDays(35),
      teamLimit: 256,
      prizePool: "$10,000",
      rules:
        "Single elimination, BO1 throughout. Open to all approved MLBB rosters. First-come first-served seeding. 256-slot bracket.",
      bannerImage: null,
      status: "REGISTRATION_OPEN",
      format: "BO1",
      description:
        "An open 256-team bracket for rising MLBB squads — one weekend, $10,000 prize pool, BO1 chaos.",
      location: "Online — SEA Server",
      organizer: "NOBLE STRIKE Esports",
      featured: false,
    },
  });

  const hokMasters = await db.tournament.create({
    data: {
      name: "HoK Masters Cup",
      game: "HOK",
      slug: "hok-masters-cup-hok25",
      startDate: inDays(21),
      registrationDeadline: inDays(10),
      teamLimit: 32,
      prizePool: "$15,000",
      rules:
        "Single elimination. BO3 throughout. Open registration for Honor of Kings rosters. Cross-server play permitted.",
      bannerImage: null,
      status: "REGISTRATION_OPEN",
      format: "BO3",
      description:
        "Open registration cup for Honor of Kings squads — 32 teams, single elimination, $15,000 on the line.",
      location: "Online — Global",
      organizer: "NOBLE STRIKE Esports",
      featured: false,
    },
  });

  const winterClash = await db.tournament.create({
    data: {
      name: "Winter Clash 2024",
      game: "MLBB",
      slug: "winter-clash-2024-wc24",
      startDate: inDays(-90),
      registrationDeadline: inDays(-110),
      teamLimit: 8,
      prizePool: "$30,000",
      rules:
        "Single elimination. BO5 throughout. Invitation-only. Standard MPL ruleset.",
      bannerImage: null,
      status: "COMPLETED",
      format: "BO5",
      description:
        "The closing chapter of the 2024 season — 8 invited MLBB teams clashed in a BO5 bracket for the winter crown.",
      location: "Studio Arena, Singapore",
      organizer: "NOBLE STRIKE Esports",
      featured: false,
    },
  });

  // 3. Create the 16 core approved MLBB teams (with multi-tournament registrations later)
  const nsTeam = await createTeam({
    name: "NOBLE STRIKE",
    tag: "NS",
    game: "MLBB",
    captainName: "Vortex",
    players: ["Vortex", "Phantom", "Reaper", "Sage", "Blitz"],
    sub: "Nova",
    region: "Southeast Asia",
    description:
      "The official NOBLE STRIKE competitive roster — forging legends across Mobile Legends: Bang Bang. A brotherhood of elite players united by one mission: dominate the arena.",
    primaryTournamentId: nsChampionship.id,
    isOfficial: true,
  });

  // Generic region pool + descriptions for the non-official teams
  const seaDesc = (flair: string) =>
    `A rising squad from the SEA circuit known for ${flair}.`;
  const coreTeamsData: Array<{
    name: string;
    tag: string;
    captainName: string;
    players: [string, string, string, string, string];
    sub: string;
    region: string;
    description: string;
  }> = [
    {
      name: "Eclipse Empire",
      tag: "EE",
      captainName: "Lumen",
      players: ["Lumen", "Umbra", "Cipher", "Quasar", "Echo"],
      sub: "Pulse",
      region: "Southeast Asia",
      description: seaDesc("calculated macro rotations and lethal late-game teamfights"),
    },
    {
      name: "Phoenix Reborn",
      tag: "PX",
      captainName: "Ember",
      players: ["Ember", "Ashen", "Cinder", "Blaze", "Flare"],
      sub: "Inferno",
      region: "South Asia",
      description: "A scrappy South Asian roster that fights from behind and never taps out.",
    },
    {
      name: "Shadow Dynasty",
      tag: "SD",
      captainName: "Wraith",
      players: ["Wraith", "Specter", "Shade", "Veil", "Dusk"],
      sub: "Phantom2",
      region: "East Asia",
      description: seaDesc("vision control and ambush setups that choke opponents out of the map"),
    },
    {
      name: "Iron Wolves",
      tag: "IW",
      captainName: "Fang",
      players: ["Fang", "Claw", "Howl", "Steel", "Ironhide"],
      sub: "Pack",
      region: "Europe",
      description: "European MLBB transplants built around disciplined early-game invades.",
    },
    {
      name: "Crimson Vanguard",
      tag: "CV",
      captainName: "Scarlet",
      players: ["Scarlet", "Rogue", "Veridian", "Onyx", "Maroon"],
      sub: "Cardinal",
      region: "North America",
      description: "A North American crew known for high-tempo skirmishing and aggressive laning.",
    },
    {
      name: "Azure Sentinels",
      tag: "AS",
      captainName: "Cobalt",
      players: ["Cobalt", "Skye", "Cerulean", "Tide", "Frost"],
      sub: "Mist",
      region: "Southeast Asia",
      description: seaDesc("methodical defensive rotations and crisp objective control"),
    },
    {
      name: "Mythic Legion",
      tag: "ML",
      captainName: "Aegis",
      players: ["Aegis", "Athena", "Valkyrie", "Titan", "Oracle"],
      sub: "Apollo",
      region: "Middle East",
      description: "A veteran Middle Eastern lineup with deep champion pools and slow-burn macro.",
    },
    {
      name: "Frostborn Kings",
      tag: "FK",
      captainName: "Glacier",
      players: ["Glacier", "Frost", "Boreas", "Polar", "Tundra"],
      sub: "Rime",
      region: "Northern Europe",
      description: "A Nordic MLBB powerhouse with a history of deep winter runs.",
    },
    {
      name: "Solar Flare",
      tag: "SF",
      captainName: "Helios",
      players: ["Helios", "Apollo", "Ra", "Sol", "Ignis"],
      sub: "Flareon",
      region: "Latin America",
      description: "A fiery LATAM roster that lights up the early game with relentless invades.",
    },
    {
      name: "Thunder Legion",
      tag: "TL",
      captainName: "Voltaic",
      players: ["Voltaic", "Storm", "Bolt", "Surge", "Spark"],
      sub: "Static",
      region: "Southeast Asia",
      description: seaDesc("blitz-fast pick compositions and surgical objective takes"),
    },
    {
      name: "Verdant Guardians",
      tag: "VG",
      captainName: "Sylvan",
      players: ["Sylvan", "Moss", "Oak", "Thorn", "Briar"],
      sub: "Petal",
      region: "Oceania",
      description: "An OCE squad that plays patient, root-and-branch macro around jungle control.",
    },
    {
      name: "Nightfall Esports",
      tag: "NE",
      captainName: "Nocturne",
      players: ["Nocturne", "Shade", "Eclipse", "Twilight", "Umbra2"],
      sub: "Midnight",
      region: "Southeast Asia",
      description: seaDesc("smoke-and-mirror rotations that punish overextended lanes"),
    },
    {
      name: "Apex Predators",
      tag: "AP",
      captainName: "Talon",
      players: ["Talon", "Raptor", "Falcon", "Hawk", "Condor"],
      sub: "Beak",
      region: "North America",
      description: "A predatory NA lineup that wins games in the first ten minutes.",
    },
    {
      name: "Celestial Order",
      tag: "CO",
      captainName: "Astral",
      players: ["Astral", "Cosmo", "Nebula", "Zenith", "Pulsar"],
      sub: "Comet",
      region: "East Asia",
      description: "A East Asian roster built around immaculate teamfight positioning.",
    },
    {
      name: "Void Reapers",
      tag: "VR",
      captainName: "Abyss",
      players: ["Abyss", "Null", "Vacuum", "Chasm", "Nadir"],
      sub: "Echo2",
      region: "Europe",
      description: "A European outfit that suffocates opponents with map-wide vision denial.",
    },
  ];

  const coreTeams: Record<string, { id: string; name: string }> = { NS: { id: nsTeam.id, name: nsTeam.name } };
  for (const t of coreTeamsData) {
    const team = await createTeam({
      name: t.name,
      tag: t.tag,
      game: "MLBB",
      captainName: t.captainName,
      players: t.players,
      sub: t.sub,
      region: t.region,
      description: t.description,
      // primary tournament: NS Championship for the first 7 (so the ONGOING
      // bracket teams all have a stable primary pointer), others → Summer Cup
      primaryTournamentId: null,
    });
    coreTeams[t.tag] = { id: team.id, name: team.name };
  }

  // 4. Lightweight extra teams registered ONLY in Golden Arena Open (to reach 24/256)
  const extraTeamsData = [
    { name: "Steel Titans", tag: "ST", captainName: "Anvil", players: ["Anvil", "Hammer", "Forge", "Smelt", "Temper"] as [string, string, string, string, string], sub: "Rivet" },
    { name: "Crimson Hawks", tag: "CH", captainName: "Talon", players: ["Talon", "Swoop", "Beak", "Plume", "Dive"] as [string, string, string, string, string], sub: "Soar" },
    { name: "Neon Vipers", tag: "NV", captainName: "Fang", players: ["Fang", "Coil", "Venom", "Hiss", "Strike"] as [string, string, string, string, string], sub: "Glow" },
    { name: "Obsidian Guard", tag: "OG", captainName: "Onyx", players: ["Onyx", "Basalt", "Flint", "Slate", "Pumice"] as [string, string, string, string, string], sub: "Shale" },
    { name: "Golden Phantoms", tag: "GP", captainName: "Aurum", players: ["Aurum", "Gilt", "Shine", "Luster", "Gleam"] as [string, string, string, string, string], sub: "Sparkle" },
    { name: "Silver Wolves", tag: "SW", captainName: "Argent", players: ["Argent", "Luna", "Howl2", "Mist2", "Pelt"] as [string, string, string, string, string], sub: "Pup" },
    { name: "Bronze Bears", tag: "BB", captainName: "Copper", players: ["Copper", "Maw", "Claw2", "Paw", "Roar"] as [string, string, string, string, string], sub: "Cub" },
    { name: "Platinum Eagles", tag: "PE", captainName: "Platin", players: ["Platin", "Soar2", "Wing", "Talon2", "Aerie"] as [string, string, string, string, string], sub: "Fledgling" },
  ];

  const extraTeams: Array<{ id: string; name: string }> = [];
  for (const t of extraTeamsData) {
    const team = await createTeam({
      name: t.name,
      tag: t.tag,
      game: "MLBB",
      captainName: t.captainName,
      players: t.players,
      sub: t.sub,
      region: "Global",
      description: `A qualifier entry registered exclusively for the Golden Arena Open.`,
      primaryTournamentId: goldenArena.id,
    });
    extraTeams.push(team);
  }

  // 5. HOK teams (4) — Dragon Hoard, Tiger Fang, Jade Warriors, Phoenix Court
  const hokTeamsData = [
    { name: "Dragon Hoard", tag: "DH", captainName: "Ryu", players: ["Ryu", "Long", "Shen", "Fucang", "Jiao"] as [string, string, string, string, string], sub: "Tatsu" },
    { name: "Tiger Fang", tag: "TF", captainName: "Hu", players: ["Hu", "Bai", "Stripes", "Claw3", "Prowl"] as [string, string, string, string, string], sub: "Cub2" },
    { name: "Jade Warriors", tag: "JW", captainName: "Yu", players: ["Yu", "Bi", "Emerald", "Jade", "Stone"] as [string, string, string, string, string], sub: "Pebble" },
    { name: "Phoenix Court", tag: "PC", captainName: "Feng", players: ["Feng", "Huang", "Feather", "Plume2", "Ash"] as [string, string, string, string, string], sub: "Ember2" },
  ];
  const hokTeams: Array<{ id: string; name: string }> = [];
  for (const t of hokTeamsData) {
    const team = await createTeam({
      name: t.name,
      tag: t.tag,
      game: "HOK",
      captainName: t.captainName,
      players: t.players,
      sub: t.sub,
      region: "East Asia",
      description: `An Honor of Kings roster preparing for the HoK Masters Cup.`,
      primaryTournamentId: hokMasters.id,
    });
    hokTeams.push(team);
  }

  // 6. PENDING teams (2) — demo the approval flow
  const rookieRascals = await createTeam({
    name: "Rookie Rascals",
    tag: "RR",
    game: "MLBB",
    captainName: "Bambino",
    players: ["Bambino", "Toto", "Pip", "Juno", "Kit"],
    sub: "Roo",
    region: "North America",
    description: "A fresh-faced NA roster looking to break into the competitive scene.",
    primaryTournamentId: goldenArena.id,
    status: "PENDING",
  });
  const novaStrikers = await createTeam({
    name: "Nova Strikers",
    tag: "NS2",
    game: "MLBB",
    captainName: "Pulsar",
    players: ["Pulsar", "Quasar2", "Nebula2", "Comet2", "Meteor"],
    sub: "Stellar",
    region: "Southeast Asia",
    description: "An up-and-coming SEA squad chasing a Summer Cup debut.",
    primaryTournamentId: nsSummerCup.id,
    status: "PENDING",
  });

  // 7. REGISTRATIONS — multi-tournament. This is the source of truth.
  //    NS Season 1 Championship (ONGOING): 8 teams (NS + EE + PX + SD + IW + CV + AS + ML)
  const nsChampTeamTags = ["NS", "EE", "PX", "SD", "IW", "CV", "AS", "ML"];
  for (const tag of nsChampTeamTags) {
    await register(coreTeams[tag].id, nsChampionship.id, "APPROVED");
  }
  // Make sure the 7 non-NS teams in the championship also have primaryTournamentId set
  for (const tag of nsChampTeamTags) {
    if (tag === "NS") continue;
    await db.team.update({
      where: { id: coreTeams[tag].id },
      data: { tournamentId: nsChampionship.id },
    });
  }

  //    NS Summer Cup (REGISTRATION_OPEN): 12 approved teams (first 12 core teams)
  const summerCupTags = ["NS", "EE", "PX", "SD", "IW", "CV", "AS", "ML", "FK", "SF", "TL", "VG"];
  for (const tag of summerCupTags) {
    await register(coreTeams[tag].id, nsSummerCup.id, "APPROVED");
  }

  //    Golden Arena Open (REGISTRATION_OPEN): all 16 approved core teams + 8 extras + 2 pending = 26 (over 24, but spec says "at least 24"; we'll register all approved extras + all core + pending)
  //    Spec wants 24/256 shown; we'll register all 16 core + 8 extras = 24 APPROVED + 2 PENDING.
  const allCoreTags = Object.keys(coreTeams).filter((t) => t !== "NS"); // 15 non-NS core teams
  for (const tag of ["NS", ...allCoreTags]) {
    await register(coreTeams[tag].id, goldenArena.id, "APPROVED");
  }
  for (const t of extraTeams) {
    await register(t.id, goldenArena.id, "APPROVED");
  }
  // Pending teams → PENDING registrations in their respective tournaments
  await register(rookieRascals.id, goldenArena.id, "PENDING");
  await register(novaStrikers.id, nsSummerCup.id, "PENDING");

  //    HoK Masters Cup: 4 HOK teams APPROVED
  for (const t of hokTeams) {
    await register(t.id, hokMasters.id, "APPROVED");
  }

  //    Winter Clash 2024 (COMPLETED): FK, SF, TL, VG — APPROVED
  const winterTags = ["FK", "SF", "TL", "VG"];
  for (const tag of winterTags) {
    await register(coreTeams[tag].id, winterClash.id, "APPROVED");
  }

  // 8. NS achievements
  await db.achievement.createMany({
    data: [
      {
        teamId: nsTeam.id,
        title: "Champions — MPL Wildcard 2024",
        description: "Undefeated run through the MPL Wildcard qualifier bracket.",
        date: "2024-09-14",
        placement: "1st",
        order: 0,
      },
      {
        teamId: nsTeam.id,
        title: "2nd Place — SEA Invitational",
        description: "Runner-up finish at the Southeast Asia Invitational, falling 2-3 in the grand final.",
        date: "2024-07-02",
        placement: "2nd",
        order: 1,
      },
      {
        teamId: nsTeam.id,
        title: "Top 4 — Global Series",
        description: "Semifinalists at the Global Series championship event in Singapore.",
        date: "2024-04-21",
        placement: "Top 4",
        order: 2,
      },
    ],
  });

  // Winter Clash 2024 achievements (Frostborn Kings champion, Solar Flare runner-up)
  await db.achievement.createMany({
    data: [
      {
        teamId: coreTeams.FK.id,
        title: "Champions — Winter Clash 2024",
        description: "Crowned Winter Clash 2024 champions after a 3-2 grand final triumph.",
        date: "2024-12-08",
        placement: "1st",
        order: 0,
      },
      {
        teamId: coreTeams.SF.id,
        title: "Runner-up — Winter Clash 2024",
        description: "Fell 2-3 in a nail-biting Winter Clash 2024 grand final.",
        date: "2024-12-08",
        placement: "2nd",
        order: 0,
      },
    ],
  });

  // 9. NS Members — 5 players, 1 coach, 1 manager
  await db.nSMember.createMany({
    data: [
      {
        name: "Marcus Chen",
        ign: "Vortex",
        role: "GOLD LANER",
        type: "PLAYER",
        bio: "Team captain and gold laner. Three-time regional MVP known for aggressive playmaking.",
        image: null,
        joinDate: "2023-01-15",
        country: "Singapore",
        order: 0,
      },
      {
        name: "Liang Wei",
        ign: "Phantom",
        role: "MID LANER",
        type: "PLAYER",
        bio: "Mid lane prodigy with the fastest reaction time on the roster.",
        image: null,
        joinDate: "2023-02-01",
        country: "China",
        order: 1,
      },
      {
        name: "Hiro Tanaka",
        ign: "Reaper",
        role: "EXP LANER",
        type: "PLAYER",
        bio: "Veteran exp laner. Quiet off-stage, ruthless in the side lane.",
        image: null,
        joinDate: "2023-01-20",
        country: "Japan",
        order: 2,
      },
      {
        name: "Daniel Cruz",
        ign: "Sage",
        role: "ROAM",
        type: "PLAYER",
        bio: "Shotcaller and roam specialist. The voice that holds the team together.",
        image: null,
        joinDate: "2023-03-10",
        country: "Philippines",
        order: 3,
      },
      {
        name: "Kai Park",
        ign: "Blitz",
        role: "JUNGLE",
        type: "PLAYER",
        bio: "Jungle duelist with a 78% first-blood rate across the season.",
        image: null,
        joinDate: "2023-02-18",
        country: "South Korea",
        order: 4,
      },
      {
        name: "Elena Rosales",
        ign: null,
        role: "HEAD COACH",
        type: "COACH",
        bio: "Former pro turned coach. Two seasons as head coach with a 71% series win rate.",
        image: null,
        joinDate: "2023-01-05",
        country: "Philippines",
        order: 5,
      },
      {
        name: "Tobias Brandt",
        ign: null,
        role: "TEAM MANAGER",
        type: "MANAGEMENT",
        bio: "Operations and logistics lead. Handles travel, sponsorships, and player welfare.",
        image: null,
        joinDate: "2022-12-01",
        country: "Germany",
        order: 6,
      },
    ],
  });

  // 10. Sponsors across tiers
  await db.sponsor.createMany({
    data: [
      { name: "ApexTech Systems", logo: null, tier: "TITANIUM", url: "https://example.com/apextech", order: 0 },
      { name: "Hyperion Energy", logo: null, tier: "PLATINUM", url: "https://example.com/hyperion", order: 1 },
      { name: "Voltedge Gear", logo: null, tier: "GOLD", url: "https://example.com/voltedge", order: 2 },
      { name: "Lumina Studios", logo: null, tier: "GOLD", url: "https://example.com/lumina", order: 3 },
      { name: "BriskBite Snacks", logo: null, tier: "PARTNER", url: "https://example.com/briskbite", order: 4 },
    ],
  });

  // 11. Social links
  await db.socialLink.createMany({
    data: [
      { platform: "Discord", url: "https://discord.gg/noblestrike", handle: "NOBLE STRIKE", order: 0 },
      { platform: "Twitter / X", url: "https://twitter.com/noblestrike", handle: "@noblestrike", order: 1 },
      { platform: "YouTube", url: "https://youtube.com/@noblestrike", handle: "NOBLE STRIKE", order: 2 },
      { platform: "Twitch", url: "https://twitch.tv/noblestrike", handle: "noblestrike", order: 3 },
      { platform: "Instagram", url: "https://instagram.com/noblestrike", handle: "@noblestrike", order: 4 },
    ],
  });

  // 12. News (6 articles, tournament-centric)
  await db.announcement.createMany({
    data: [
      {
        title: "NS Season 1 Championship Kicks Off",
        content:
          "After a grueling open qualifier that saw 128 teams battle for eight bracket slots, the NS Season 1 Championship is officially live. NOBLE STRIKE, Eclipse Empire, Phoenix Reborn, Shadow Dynasty, Iron Wolves, Crimson Vanguard, Azure Sentinels, and Mythic Legion will contest a single-elimination BO3 bracket culminating in a BO5 grand final at Singapore Arena.\n\nThe opening round has already delivered: NOBLE STRIKE opened with a 2-1 win over Eclipse Empire, while Shadow Dynasty swept Iron Wolves 2-0. The remaining two quarterfinals are LIVE now on the NOBLE STRIKE Twitch channel.\n\n\"We came here to win the whole thing,\" said NS captain Vortex after the opening series. \"The bracket is stacked, but so are we.\"",
        excerpt:
          "Eight elite MLBB rosters, a $50,000 prize pool, and a live bracket at Singapore Arena — the NS Season 1 Championship is underway.",
        category: "TOURNAMENT_NEWS",
        featured: true,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "NOBLE STRIKE Announces Full Roster for 2025 Season",
        content:
          "NOBLE STRIKE is proud to confirm our 2025 starting roster. Captain Vortex returns at gold lane, with Phantom on mid, Reaper on exp, Sage roaming, and Blitz in the jungle. Nova remains our substitute and will step in across the season.\n\nThe coaching staff and management are unchanged — Elena Rosales continues as head coach, with Tobias Brandt handling team operations. The roster will debut the new season at the NS Season 1 Championship and the NS Summer Cup 2025.\n\n\"Continuity is our edge,\" said head coach Elena Rosales. \"We're keeping the core that won MPL Wildcard and adding layers to our playbook.\"",
        excerpt:
          "Vortex, Phantom, Reaper, Sage, and Blitz return as the 2025 starting five, with Nova as substitute and an unchanged coaching staff.",
        category: "TEAM_UPDATES",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "Rising Star Vortex Signs Multi-Year Deal with NS",
        content:
          "Captain and gold laner Marcus \"Vortex\" Chen has signed a multi-year contract extension keeping him with NOBLE STRIKE through the 2027 season. Vortex has been the face of the franchise since 2023, accumulating three regional MVPs and the 2024 MPL Wildcard championship.\n\n\"NOBLE STRIKE is home,\" Vortex said. \"We're building something special here — a legacy. I want to lift the NS Season 1 trophy and the Global Series trophy with this exact five.\"\n\nThe extension comes as NS prepares for the NS Season 1 Championship quarterfinals this weekend.",
        excerpt:
          "Captain Vortex commits to NOBLE STRIKE through 2027 as the franchise gears up for its Season 1 Championship run.",
        category: "PLAYER_SIGNINGS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "Frostborn Kings Crowned Winter Clash 2024 Champions",
        content:
          "Frostborn Kings lifted the Winter Clash 2024 trophy after a dramatic 3-2 grand final victory over Solar Flare at Studio Arena, Singapore. The Nordic squad came back from a 2-1 deficit, taking game four with a base-race finish and closing out game five with a flawless teamfight at 18 minutes.\n\n\"This is the result of a year of grinding,\" said Frostborn Kings captain Glacier. \"We've been chasing this trophy since 2023.\"\n\nThe win caps a strong 2024 campaign for the Kings and earns them a direct invite to the 2025 NS Season 1 Championship qualifier. Solar Flare, the runner-up, takes home $12,000 and an invite as well.",
        excerpt:
          "A 3-2 grand final triumph over Solar Flare delivers Frostborn Kings the Winter Clash 2024 title and a 2025 NS Season 1 invite.",
        category: "RESULTS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "Registration Now Open for Golden Arena Open — 256 Slots",
        content:
          "The biggest open bracket in NOBLE STRIKE history is here. The Golden Arena Open welcomes 256 MLBB teams to a single-elimination BO1 bracket with a $10,000 prize pool. Registration is open now through the NS platform.\n\n\"This is the most inclusive tournament we've ever run,\" said tournament organizer Tobias Brandt. \"Whether you're a top-tier pro squad or a group of friends who just hit Mythic, there's a slot for you.\"\n\nAll approved NS rosters are eligible to register. Seeds are awarded on a first-come first-served basis once rosters are approved, so register early to lock in your slot.",
        excerpt:
          "256 MLBB teams. $10,000 prize pool. BO1 single elimination. Registration for the Golden Arena Open is live.",
        category: "ANNOUNCEMENTS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "NS Summer Cup Returns with $25,000 Prize Pool",
        content:
          "The NS Summer Cup is back for 2025, and it's bigger than ever. 64 MLBB teams will compete in a single-elimination BO3 bracket with a $25,000 prize pool. Registration is now open on the NS platform for all approved rosters.\n\n\"The Summer Cup is our mid-season spotlight,\" said NS head of operations Elena Rosales. \"With 64 slots, we can host nearly every competitive roster in the region. Expect upsets, breakout stars, and high-level MLBB all summer.\"\n\nThe tournament runs across three weekends in the new year. Seeds are awarded on a first-come first-served basis once rosters are approved.",
        excerpt:
          "64 MLBB teams. BO3 single elimination. $25,000 prize pool. NS Summer Cup 2025 registration is open.",
        category: "TOURNAMENT_NEWS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
    ],
  });

  // 13. Bracket generation for the ONGOING tournament (NS Season 1 Championship)
  //     8 approved teams registered in this tournament. Build single-elim bracket:
  //     Round 1: 4 matches. Round 2: 2 matches. Round 3 (final): 1 match.
  const nsBracketTeams = (
    await db.team.findMany({
      where: {
        registrations: {
          some: { tournamentId: nsChampionship.id, status: "APPROVED" },
        },
      },
    })
  ).sort((a, b) => {
    // Stable ordering by tag for reproducible brackets.
    // Order chosen so round-1 pairings are:
    //   M0: NS vs EE   |   M1: SD vs IW   |   M2: PX vs CV   |   M3: AS vs ML
    // This lets us pre-complete M0 as NS 2-1 EE and M1 as SD 2-0 IW per spec.
    const order = ["NS", "EE", "SD", "IW", "PX", "CV", "AS", "ML"];
    return order.indexOf(a.tag || "") - order.indexOf(b.tag || "");
  });

  if (nsBracketTeams.length >= 2) {
    const paddedSize = nextPow2(nsBracketTeams.length); // 8
    const slots: (typeof nsBracketTeams[number] | null)[] = [...nsBracketTeams];
    while (slots.length < paddedSize) slots.push(null);

    const totalRounds = Math.log2(paddedSize); // 3

    // Create empty matches for all rounds
    const roundMatches: { id: string; round: number; matchIndex: number }[][] = [];
    for (let r = 1; r <= totalRounds; r++) {
      const count = paddedSize / Math.pow(2, r);
      const arr: { id: string; round: number; matchIndex: number }[] = [];
      for (let mi = 0; mi < count; mi++) {
        const created = await db.match.create({
          data: {
            tournamentId: nsChampionship.id,
            round: r,
            matchIndex: mi,
            format: nsChampionship.format || "BO3",
            status: "PENDING",
          },
        });
        arr.push({ id: created.id, round: r, matchIndex: mi });
      }
      roundMatches.push(arr);
    }

    // Populate round 1
    for (let mi = 0; mi < roundMatches[0].length; mi++) {
      const teamA = slots[mi * 2];
      const teamB = slots[mi * 2 + 1];
      const m = roundMatches[0][mi];
      if (teamA && teamB) {
        await db.match.update({
          where: { id: m.id },
          data: { teamAId: teamA.id, teamBId: teamB.id },
        });
      }
    }

    // Set nextMatchId
    for (let r = 0; r < totalRounds - 1; r++) {
      for (const m of roundMatches[r]) {
        const nextMatch = roundMatches[r + 1][Math.floor(m.matchIndex / 2)];
        if (nextMatch) {
          await db.match.update({
            where: { id: m.id },
            data: { nextMatchId: nextMatch.id },
          });
        }
      }
    }

    // Pre-complete matches 1 and 2 of round 1 (NS 2-1 Eclipse Empire,
    // Shadow Dynasty 2-0 Iron Wolves), then advance winners into round 2.
    const r1 = roundMatches[0];
    // Pre-determined results: match index 0 → NS wins 2-1; match index 1 → SD wins 2-0
    const seededResults: Array<{ matchIndex: number; scoreA: number; scoreB: number; winnerTag: string }> = [
      { matchIndex: 0, scoreA: 2, scoreB: 1, winnerTag: "NS" },
      { matchIndex: 1, scoreA: 2, scoreB: 0, winnerTag: "SD" },
    ];
    for (const r of seededResults) {
      const m = r1[r.matchIndex];
      const full = await db.match.findUnique({
        where: { id: m.id },
        select: { teamAId: true, teamBId: true, nextMatchId: true },
      });
      if (!full) continue;
      // Determine winner ID by tag
      const winnerTeam = nsBracketTeams.find((t) => t.tag === r.winnerTag);
      if (!winnerTeam) continue;
      // Ensure winner is teamA for the advancing math below (the API uses
      // even→teamA / odd→teamB convention based on matchIndex, which is
      // independent of who actually won — so we just set winnerId.)
      await db.match.update({
        where: { id: m.id },
        data: {
          scoreA: r.scoreA,
          scoreB: r.scoreB,
          winnerId: winnerTeam.id,
          status: "COMPLETED",
        },
      });
      if (full.nextMatchId) {
        const isEven = m.matchIndex % 2 === 0;
        await db.match.update({
          where: { id: full.nextMatchId },
          data: isEven
            ? { teamAId: winnerTeam.id }
            : { teamBId: winnerTeam.id },
        });
      }
    }
    // Matches 3 and 4 of round 1 are left as PENDING (LIVE) — no completion.
  }

  // 14. Winter Clash 2024 (COMPLETED) — 4-team bracket, fully played.
  //     Round 1: 2 matches (both completed). Round 2 (final): 1 match (Frostborn Kings win 3-2).
  const winterTeams = (
    await db.team.findMany({
      where: {
        registrations: {
          some: { tournamentId: winterClash.id, status: "APPROVED" },
        },
      },
    })
  ).sort((a, b) => {
    const order = ["FK", "SF", "TL", "VG"];
    return order.indexOf(a.tag || "") - order.indexOf(b.tag || "");
  });

  if (winterTeams.length === 4) {
    const [fk, sf, tl, vg] = winterTeams;
    // Round 1, match 0: FK 3 - 1 SF
    const r1m1 = await db.match.create({
      data: {
        tournamentId: winterClash.id,
        round: 1,
        matchIndex: 0,
        format: "BO5",
        teamAId: fk.id,
        teamBId: sf.id,
        status: "COMPLETED",
        scoreA: 3,
        scoreB: 1,
        winnerId: fk.id,
        scheduledAt: inDays(-95),
      },
    });
    // Round 1, match 1: TL 2 - 3 VG (VG advances)
    const r1m2 = await db.match.create({
      data: {
        tournamentId: winterClash.id,
        round: 1,
        matchIndex: 1,
        format: "BO5",
        teamAId: tl.id,
        teamBId: vg.id,
        status: "COMPLETED",
        scoreA: 2,
        scoreB: 3,
        winnerId: vg.id,
        scheduledAt: inDays(-95),
      },
    });
    // Round 2, match 0 (grand final): FK 3 - 2 VG (FK is champion)
    const finalMatch = await db.match.create({
      data: {
        tournamentId: winterClash.id,
        round: 2,
        matchIndex: 0,
        format: "BO5",
        teamAId: fk.id,
        teamBId: vg.id,
        status: "COMPLETED",
        scoreA: 3,
        scoreB: 2,
        winnerId: fk.id,
        scheduledAt: inDays(-90),
      },
    });
    await db.match.update({
      where: { id: r1m1.id },
      data: { nextMatchId: finalMatch.id },
    });
    await db.match.update({
      where: { id: r1m2.id },
      data: { nextMatchId: finalMatch.id },
    });
  }

  // Return final counts
  const [
    tournamentCount,
    teamCount,
    matchCount,
    registrationCount,
    achievementCount,
    memberCount,
    sponsorCount,
    socialCount,
    announcementCount,
    userCount,
  ] = await Promise.all([
    db.tournament.count(),
    db.team.count(),
    db.match.count(),
    db.registration.count(),
    db.achievement.count(),
    db.nSMember.count(),
    db.sponsor.count(),
    db.socialLink.count(),
    db.announcement.count(),
    db.user.count(),
  ]);

  return {
    tournaments: tournamentCount,
    teams: teamCount,
    matches: matchCount,
    registrations: registrationCount,
    achievements: achievementCount,
    members: memberCount,
    sponsors: sponsorCount,
    socials: socialCount,
    announcements: announcementCount,
    users: userCount,
  };
}
