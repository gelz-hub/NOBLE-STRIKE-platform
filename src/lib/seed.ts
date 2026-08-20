// NOBLE STRIKE — shared seed logic used by both `prisma/seed.ts` and
// the /api/admin/seed route so the frontend "load demo data" button can
// trigger a re-seed without restarting the server.
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

  // 2. Create 4 tournaments
  const nsChampionship = await db.tournament.create({
    data: {
      name: "NS Championship 2025",
      game: "MLBB",
      slug: "ns-championship-2025-ns25",
      startDate: inDays(7),
      registrationDeadline: inDays(3),
      teamLimit: 8,
      prizePool: "$50,000",
      rules:
        "Single elimination. BO3 round of 8 and semifinals. BO5 grand final. Standard MPL ruleset. All players must be 18+. Roster lock 24h before kickoff.",
      bannerImage: null,
      status: "ONGOING",
      format: "BO3",
      description:
        "The flagship NOBLE STRIKE invitational — 8 elite MLBB rosters battle across three days for a $50,000 prize pool and the NS trophy.",
      location: "Online — SEA Server",
      organizer: "NOBLE STRIKE Esports",
      featured: true,
    },
  });

  const hokMasters = await db.tournament.create({
    data: {
      name: "HoK Masters Cup",
      game: "HOK",
      slug: "hok-masters-cup-hok25",
      startDate: inDays(21),
      registrationDeadline: inDays(14),
      teamLimit: 16,
      prizePool: "$25,000",
      rules:
        "Single elimination. BO1 round of 16, BO3 quarterfinals onward. Honor of Kings Pro ruleset. Cross-server play permitted.",
      bannerImage: null,
      status: "REGISTRATION_OPEN",
      format: "BO3",
      description:
        "Open registration cup for Honor of Kings squads — 16 teams, single elimination, $25,000 on the line.",
      location: "Online — Global",
      organizer: "NOBLE STRIKE Esports",
      featured: true,
    },
  });

  const goldenArena = await db.tournament.create({
    data: {
      name: "Golden Arena Open",
      game: "MLBB",
      slug: "golden-arena-open-ga25",
      startDate: inDays(35),
      registrationDeadline: inDays(28),
      teamLimit: 32,
      prizePool: "$10,000",
      rules:
        "Single elimination, BO1 throughout. Open to all approved MLBB rosters. First-come first-served seeding.",
      bannerImage: null,
      status: "REGISTRATION_OPEN",
      format: "BO1",
      description:
        "An open bracket for rising MLBB squads — 32 teams, one weekend, $10,000 prize pool.",
      location: "Online — SEA Server",
      organizer: "NOBLE STRIKE Esports",
      featured: false,
    },
  });

  const winterClash = await db.tournament.create({
    data: {
      name: "Winter Clash 2024",
      game: "MLBB",
      slug: "winter-clash-2024-wc24",
      startDate: inDays(-120),
      registrationDeadline: inDays(-140),
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

  // 3. Official NOBLE STRIKE team (assigned to NS Championship)
  const nsTeam = await db.team.create({
    data: {
      name: "NOBLE STRIKE",
      logo: null,
      captainName: "Vortex",
      discordUsername: "vortex#0001",
      contactNumber: "+1-555-0100",
      game: "MLBB",
      tournamentId: nsChampionship.id,
      status: "APPROVED",
      isOfficial: true,
      player1: "Vortex",
      player2: "Phantom",
      player3: "Reaper",
      player4: "Sage",
      player5: "Blitz",
      substitute: "Nova",
      region: "Southeast Asia",
      tag: "NS",
    },
  });

  // 4. Seven other approved teams (mix MLBB & HOK). All assigned to NS Championship
  //    for the live bracket — but two of them are HOK teams entered for the
  //    HoK Masters Cup instead.
  const otherTeamsData = [
    {
      name: "Eclipse Empire",
      tag: "EE",
      game: "MLBB",
      captainName: "Lumen",
      players: ["Lumen", "Umbra", "Cipher", "Quasar", "Echo"],
      sub: "Pulse",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Phoenix Reborn",
      tag: "PX",
      game: "MLBB",
      captainName: "Ember",
      players: ["Ember", "Ashen", "Cinder", "Blaze", "Flare"],
      sub: "Inferno",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Shadow Dynasty",
      tag: "SD",
      game: "MLBB",
      captainName: "Wraith",
      players: ["Wraith", "Specter", "Shade", "Veil", "Dusk"],
      sub: "Phantom2",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Iron Wolves",
      tag: "IW",
      game: "MLBB",
      captainName: "Fang",
      players: ["Fang", "Claw", "Howl", "Steel", "Ironhide"],
      sub: "Pack",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Crimson Vanguard",
      tag: "CV",
      game: "MLBB",
      captainName: "Scarlet",
      players: ["Scarlet", "Rogue", "Veridian", "Onyx", "Maroon"],
      sub: "Cardinal",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Azure Sentinels",
      tag: "AS",
      game: "MLBB",
      captainName: "Cobalt",
      players: ["Cobalt", "Skye", "Cerulean", "Tide", "Frost"],
      sub: "Mist",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Mythic Legion",
      tag: "ML",
      game: "MLBB",
      captainName: "Aegis",
      players: ["Aegis", "Athena", "Valkyrie", "Titan", "Oracle"],
      sub: "Apollo",
      tournamentId: nsChampionship.id,
    },
    {
      name: "Dragon Hoard",
      tag: "DH",
      game: "HOK",
      captainName: "Ryu",
      players: ["Ryu", "Long", "Shen", "Fucang", "Jiao"],
      sub: "Tatsu",
      tournamentId: hokMasters.id,
    },
  ];

  const createdTeams = [nsTeam];
  for (const t of otherTeamsData) {
    const team = await db.team.create({
      data: {
        name: t.name,
        logo: null,
        captainName: t.captainName,
        discordUsername: `${t.captainName.toLowerCase()}#${1000 + Math.floor(Math.random() * 8999)}`,
        contactNumber: `+1-555-${Math.floor(1000 + Math.random() * 8999)}`,
        game: t.game,
        tournamentId: t.tournamentId,
        status: "APPROVED",
        isOfficial: false,
        player1: t.players[0],
        player2: t.players[1],
        player3: t.players[2],
        player4: t.players[3],
        player5: t.players[4],
        substitute: t.sub,
        region: "Global",
        tag: t.tag,
      },
    });
    createdTeams.push(team);

    // For open tournaments create a registration entry as well
    await db.registration.create({
      data: {
        tournamentId: t.tournamentId,
        teamId: team.id,
        status: "APPROVED",
      },
    });
  }

  // Also create a PENDING team to demonstrate the registration flow
  await db.team.create({
    data: {
      name: "Rookie Rascals",
      logo: null,
      captainName: "Bambino",
      discordUsername: "bambino#0420",
      contactNumber: "+1-555-0142",
      game: "MLBB",
      tournamentId: goldenArena.id,
      status: "PENDING",
      isOfficial: false,
      player1: "Bambino",
      player2: "Toto",
      player3: "Pip",
      player4: "Juno",
      player5: "Kit",
      substitute: "Roo",
      region: "North America",
      tag: "RR",
    },
  });

  // 5. NS achievements
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

  // 6. NS Members — 5 players, 1 coach, 1 manager
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

  // 7. Sponsors across tiers
  await db.sponsor.createMany({
    data: [
      {
        name: "ApexTech Systems",
        logo: null,
        tier: "TITANIUM",
        url: "https://example.com/apextech",
        order: 0,
      },
      {
        name: "Hyperion Energy",
        logo: null,
        tier: "PLATINUM",
        url: "https://example.com/hyperion",
        order: 1,
      },
      {
        name: "Voltedge Gear",
        logo: null,
        tier: "GOLD",
        url: "https://example.com/voltedge",
        order: 2,
      },
      {
        name: "Lumina Studios",
        logo: null,
        tier: "GOLD",
        url: "https://example.com/lumina",
        order: 3,
      },
      {
        name: "BriskBite Snacks",
        logo: null,
        tier: "PARTNER",
        url: "https://example.com/briskbite",
        order: 4,
      },
    ],
  });

  // 8. Social links
  await db.socialLink.createMany({
    data: [
      { platform: "Discord", url: "https://discord.gg/noblestrike", handle: "NOBLE STRIKE", order: 0 },
      { platform: "Twitter / X", url: "https://twitter.com/noblestrike", handle: "@noblestrike", order: 1 },
      { platform: "YouTube", url: "https://youtube.com/@noblestrike", handle: "NOBLE STRIKE", order: 2 },
      { platform: "Twitch", url: "https://twitch.tv/noblestrike", handle: "noblestrike", order: 3 },
      { platform: "Instagram", url: "https://instagram.com/noblestrike", handle: "@noblestrike", order: 4 },
    ],
  });

  // 9. Announcements
  await db.announcement.createMany({
    data: [
      {
        title: "NS Championship 2025 kicks off next weekend",
        content:
          "The NS Championship 2025 begins next Saturday with eight elite MLBB rosters, a $50,000 prize pool, and three days of single-elimination action. NOBLE STRIKE headlines the bracket as the top seed after their MPL Wildcard triumph.\n\nRound of 8 will be best-of-three, with the grand final moving to a best-of-five showcase. All matches stream live on the NOBLE STRIKE Twitch channel starting 14:00 SGT.",
        excerpt:
          "Eight elite MLBB rosters, a $50,000 prize pool, three days of single-elimination bracket play — the NS Championship 2025 goes live next weekend.",
        category: "TOURNAMENT_NEWS",
        featured: true,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "NOBLE STRIKE announces 2025 roster",
        content:
          "NOBLE STRIKE is proud to confirm our 2025 starting roster. Captain Vortex returns at gold lane, with Phantom on mid, Reaper on exp, Sage roaming, and Blitz in the jungle. Nova remains our substitute and will step in across the season.\n\nThe coaching staff and management are unchanged — Elena Rosales continues as head coach, with Tobias Brandt handling team operations.",
        excerpt:
          "Vortex, Phantom, Reaper, Sage, and Blitz return as the 2025 starting five, with Nova as substitute and an unchanged coaching staff.",
        category: "TEAM_UPDATES",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "Blitz signs two-year extension with NOBLE STRIKE",
        content:
          "Jungler Kai 'Blitz' Park has signed a two-year contract extension keeping him with NOBLE STRIKE through the 2026 season. Blitz joined the roster in February 2023 and has since posted a 78% first-blood rate and three tournament MVPs.\n\n'I'm honored to keep wearing the NS crest,' Blitz said. 'We have unfinished business at Globals and I want to finish what we started.'",
        excerpt:
          "Star jungler Blitz commits to NOBLE STRIKE through 2026 after a standout season with a 78% first-blood rate.",
        category: "PLAYER_SIGNINGS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "NOBLE STRIKE crowned MPL Wildcard Champions 2024",
        content:
          "NOBLE STRIKE completed an undefeated run through the MPL Wildcard qualifier bracket last weekend, securing the championship title and a direct seed into the 2025 premier circuit.\n\nThe team dropped only a single game across the entire bracket, sweeping every series 2-0 except a tightly contested 2-1 semifinal. Vortex was named tournament MVP.",
        excerpt:
          "An undefeated MPL Wildcard run delivers NS the championship title and a direct seed into the 2025 premier circuit.",
        category: "RESULTS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "HoK Masters Cup registration now open",
        content:
          "Registration is now open for the HoK Masters Cup — a 16-team single-elimination Honor of Kings bracket with a $25,000 prize pool. The cup is open to all approved HOK rosters and runs across three weekends in the new year.\n\nTeams can register through the NOBLE STRIKE platform. Seeds are awarded on a first-come first-served basis once rosters are approved.",
        excerpt:
          "16 HOK teams. $25,000 prize pool. Single-elimination across three weekends. Registration is now open.",
        category: "TOURNAMENT_NEWS",
        featured: false,
        coverImage: null,
        author: "NS Editorial",
      },
      {
        title: "Platform update: new bracket viewer and admin tools",
        content:
          "We've shipped a major platform update. The bracket viewer now supports live match advancement, and team managers can submit scores directly from the admin panel.\n\nAlso included: improved roster display on the NS team page, sponsor tier badges, and a new social links module in the footer. Full changelog is available on the NS Discord.",
        excerpt:
          "Live bracket advancement, admin score submission, improved roster display, and sponsor tier badges are now live.",
        category: "ANNOUNCEMENTS",
        featured: false,
        coverImage: null,
        author: "NS Engineering",
      },
    ],
  });

  // 10. Generate bracket for the ONGOING tournament (NS Championship)
  //     8 approved MLBB teams assigned to it.
  const nsTeams = await db.team.findMany({
    where: { tournamentId: nsChampionship.id, status: "APPROVED" },
  });

  if (nsTeams.length >= 2) {
    const shuffled = shuffle(nsTeams);
    const paddedSize = nextPow2(shuffled.length); // 8
    const slots: (typeof nsTeams[number] | null)[] = [...shuffled];
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
      } else if (teamA && !teamB) {
        await db.match.update({
          where: { id: m.id },
          data: {
            teamAId: teamA.id,
            winnerId: teamA.id,
            status: "COMPLETED",
            scoreA: 1,
            scoreB: 0,
          },
        });
      } else if (!teamA && teamB) {
        await db.match.update({
          where: { id: m.id },
          data: {
            teamBId: teamB.id,
            winnerId: teamB.id,
            status: "COMPLETED",
            scoreA: 0,
            scoreB: 1,
          },
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

    // Propagate BYE winners into round 2
    if (totalRounds >= 2) {
      for (const m of roundMatches[0]) {
        const full = await db.match.findUnique({
          where: { id: m.id },
          select: { winnerId: true, status: true, matchIndex: true, nextMatchId: true },
        });
        if (full?.status === "COMPLETED" && full.winnerId && full.nextMatchId) {
          const isEven = full.matchIndex % 2 === 0;
          await db.match.update({
            where: { id: full.nextMatchId },
            data: isEven
              ? { teamAId: full.winnerId }
              : { teamBId: full.winnerId },
          });
        }
      }
    }

    // Seed results for 2 of the round-1 matches (with advancing)
    const r1 = roundMatches[0];
    const completedR1: { winnerId: string; matchIndex: number; nextMatchId: string | null }[] = [];
    for (let i = 0; i < Math.min(2, r1.length); i++) {
      const m = r1[i];
      const full = await db.match.findUnique({
        where: { id: m.id },
        select: { teamAId: true, teamBId: true, status: true },
      });
      if (!full || full.status === "COMPLETED" || !full.teamAId || !full.teamBId) continue;
      // Pick teamA as the winner for the seeded result
      const winnerId = full.teamAId;
      const updated = await db.match.update({
        where: { id: m.id },
        data: {
          scoreA: 2,
          scoreB: 1,
          winnerId,
          status: "COMPLETED",
        },
      });
      completedR1.push({
        winnerId,
        matchIndex: updated.matchIndex,
        nextMatchId: updated.nextMatchId,
      });
    }
    // Advance winners into round 2
    for (const c of completedR1) {
      if (!c.nextMatchId) continue;
      const isEven = c.matchIndex % 2 === 0;
      await db.match.update({
        where: { id: c.nextMatchId },
        data: isEven ? { teamAId: c.winnerId } : { teamBId: c.winnerId },
      });
    }
  }

  // 11. For the COMPLETED tournament (Winter Clash), create a fully-played bracket
  //     We assign 4 fictional teams to it (separate from the live NS bracket) so
  //     we don't disturb team.tournamentId for the NS championship teams.
  const winterTeamsData = [
    {
      name: "Frostborn Kings",
      tag: "FK",
      captainName: "Glacier",
      players: ["Glacier", "Frost", "Boreas", "Polar", "Tundra"],
    },
    {
      name: "Solar Flare",
      tag: "SF",
      captainName: "Helios",
      players: ["Helios", "Apollo", "Ra", "Sol", "Ignis"],
    },
    {
      name: "Thunder Legion",
      tag: "TL",
      captainName: "Voltaic",
      players: ["Voltaic", "Storm", "Bolt", "Surge", "Spark"],
    },
    {
      name: "Verdant Guardians",
      tag: "VG",
      captainName: "Sylvan",
      players: ["Sylvan", "Moss", "Oak", "Thorn", "Briar"],
    },
  ];

  const winterTeams = [];
  for (const t of winterTeamsData) {
    const team = await db.team.create({
      data: {
        name: t.name,
        logo: null,
        captainName: t.captainName,
        discordUsername: `${t.captainName.toLowerCase()}#${Math.floor(1000 + Math.random() * 8999)}`,
        contactNumber: `+1-555-${Math.floor(1000 + Math.random() * 8999)}`,
        game: "MLBB",
        tournamentId: winterClash.id,
        status: "APPROVED",
        isOfficial: false,
        player1: t.players[0],
        player2: t.players[1],
        player3: t.players[2],
        player4: t.players[3],
        player5: t.players[4],
        substitute: null,
        region: "Global",
        tag: t.tag,
      },
    });
    winterTeams.push(team);
  }

  // Build a 4-team, 2-round bracket for Winter Clash (already completed)
  // Round 1: 2 matches. Round 2 (final): 1 match.
  const r1m1 = await db.match.create({
    data: {
      tournamentId: winterClash.id,
      round: 1,
      matchIndex: 0,
      format: "BO5",
      teamAId: winterTeams[0].id,
      teamBId: winterTeams[1].id,
      status: "COMPLETED",
      scoreA: 3,
      scoreB: 1,
      winnerId: winterTeams[0].id,
    },
  });
  const r1m2 = await db.match.create({
    data: {
      tournamentId: winterClash.id,
      round: 1,
      matchIndex: 1,
      format: "BO5",
      teamAId: winterTeams[2].id,
      teamBId: winterTeams[3].id,
      status: "COMPLETED",
      scoreA: 2,
      scoreB: 3,
      winnerId: winterTeams[3].id,
    },
  });
  await db.match.create({
    data: {
      tournamentId: winterClash.id,
      round: 2,
      matchIndex: 0,
      format: "BO5",
      teamAId: winterTeams[0].id,
      teamBId: winterTeams[3].id,
      status: "COMPLETED",
      scoreA: 3,
      scoreB: 2,
      winnerId: winterTeams[0].id,
      scheduledAt: inDays(-118),
    },
  });
  await db.match.update({
    where: { id: r1m1.id },
    data: { nextMatchId: (await db.match.findFirst({
      where: { tournamentId: winterClash.id, round: 2, matchIndex: 0 },
    }))!.id },
  });
  await db.match.update({
    where: { id: r1m2.id },
    data: { nextMatchId: (await db.match.findFirst({
      where: { tournamentId: winterClash.id, round: 2, matchIndex: 0 },
    }))!.id },
  });

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
