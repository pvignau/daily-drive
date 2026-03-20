/**
 * CLI script to test playlist building without the frontend.
 *
 * Usage:
 *   SPOTIFY_REFRESH_TOKEN=xxx npx tsx scripts/build-playlist.ts
 *
 * Optionally set SPOTIFY_PLAYLIST_ID to update an existing playlist.
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load env vars from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { refreshAccessToken } from "../src/lib/spotify";
import { buildPlaylist } from "../src/lib/playlist-builder";

async function main() {
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!refreshToken) {
    console.error("Error: SPOTIFY_REFRESH_TOKEN env var is required");
    process.exit(1);
  }

  console.log("Refreshing access token...");
  const { accessToken } = await refreshAccessToken(refreshToken);
  console.log("Access token obtained.\n");

  const existingPlaylistId = process.env.SPOTIFY_PLAYLIST_ID ?? null;

  const result = await buildPlaylist(accessToken, existingPlaylistId, (msg) =>
    console.log(`  ${msg}`)
  );

  console.log("\n--- Summary ---");
  console.log(`Playlist ID: ${result.playlistId}`);
  console.log(`Tracks (recent/top): ${result.tracks.length}`);
  console.log(`Tracks (recommendations): ${result.recommendations.length}`);
  console.log(`Episodes: ${result.episodes.length}`);
  console.log(`Total URIs in playlist: ${result.uris.length}`);

  console.log("\n--- Tracks ---");
  result.tracks.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} — ${t.artists.map((a) => a.name).join(", ")}`);
  });

  console.log("\n--- Recommendations ---");
  result.recommendations.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name} — ${t.artists.map((a) => a.name).join(", ")}`);
  });

  console.log("\n--- Episodes ---");
  result.episodes.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.name} (${e.show.name})`);
  });

  console.log(
    `\nPlaylist: https://open.spotify.com/playlist/${result.playlistId}`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
