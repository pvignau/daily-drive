/**
 * Lists saved podcasts sorted by listening score.
 *
 * Usage:
 *   SPOTIFY_REFRESH_TOKEN=xxx npx tsx scripts/list-shows.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { refreshAccessToken, getShowsWithEpisodes } from "../src/lib/spotify";
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  await prisma.$disconnect();

  if (!user) {
    console.error("No user found in DB. Log in via the dashboard first.");
    process.exit(1);
  }

  const extraShowIds = (JSON.parse(user.extraShows ?? "[]") as { id: string }[]).map((s) => s.id);
  if (extraShowIds.length > 0) {
    console.log(`Extra shows from DB: ${extraShowIds.join(", ")}`);
  }

  console.log("Refreshing token...");
  const { accessToken } = await refreshAccessToken(user.refreshToken);

  console.log("Fetching and scoring shows...\n");
  const scored = await getShowsWithEpisodes(accessToken, extraShowIds);

  console.log(`${"Score".padEnd(7)} ${"Show".padEnd(50)} Next unplayed episode`);
  console.log("─".repeat(110));

  for (const { show, score, latestUnplayed } of scored) {
    const ep = latestUnplayed ? `"${latestUnplayed.name.slice(0, 40)}"` : "(none)";
    console.log(`${String(score).padEnd(7)} ${show.name.slice(0, 50).padEnd(50)} ${ep}`);
  }

  console.log(`\n${scored.length} shows total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
