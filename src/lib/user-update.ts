import { prisma } from "@/lib/db";
import { refreshAccessToken } from "@/lib/spotify";
import { buildPlaylist } from "@/lib/playlist-builder";

export async function runUpdateForUser(
  spotifyId: string,
  log: (msg: string) => void = console.log
): Promise<{ playlistId: string; logs: string[] }> {
  const user = await prisma.user.findUnique({ where: { spotifyId } });
  if (!user) throw new Error(`User not found: ${spotifyId}`);

  const logs: string[] = [];
  const logger = (msg: string) => {
    log(`[${spotifyId}] ${msg}`);
    logs.push(msg);
  };

  let { accessToken, refreshToken, tokenExpiry } = user;

  if (new Date(tokenExpiry) < new Date(Date.now() + 5 * 60 * 1000)) {
    logger("Refreshing access token...");
    const refreshed = await refreshAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    tokenExpiry = refreshed.tokenExpiry;
    await prisma.user.update({
      where: { id: user.id },
      data: { accessToken, refreshToken, tokenExpiry },
    });
  }

  // VULN-05: JSON.parse with validation
  let extraShowIds: string[] = [];
  try {
    const parsed = JSON.parse(user.extraShows || "[]");
    if (Array.isArray(parsed)) {
      extraShowIds = parsed
        .filter((s: unknown) => s !== null && typeof s === "object" && typeof (s as Record<string, unknown>).id === "string")
        .map((s: unknown) => (s as { id: string }).id);
    }
  } catch { /* ignore malformed JSON */ }

  let blockedTrackUris: string[] = [];
  try {
    const parsed = JSON.parse(user.blockedTrackUris || "[]");
    if (Array.isArray(parsed)) {
      blockedTrackUris = parsed.filter((u: unknown) => typeof u === "string");
    }
  } catch { /* ignore malformed JSON */ }

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  const result = await buildPlaylist(
    accessToken,
    user.playlistId,
    logger,
    extraShowIds,
    user.playlistName,
    user.targetDuration,
    blockedTrackUris,
    user.discoveryRatio,
    appUrl
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      playlistId: result.playlistId,
      lastRun: new Date(),
      accessToken,
      refreshToken,
      tokenExpiry,
    },
  });

  return { playlistId: result.playlistId, logs };
}
