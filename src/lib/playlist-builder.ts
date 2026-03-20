import {
  SpotifyTrack,
  SpotifyEpisode,
  getRecentlyPlayed,
  getTopTracks,
  getDiscoveryTracks,
  getShowsWithEpisodes,
  getOrCreatePlaylist,
  clearPlaylist,
  addTracksToPlaylist,
  getSpotifyProfile,
  updatePlaylistDetails,
} from "./spotify";

// Tracks from these artist IDs are always excluded from the playlist.
const BLOCKED_ARTIST_IDS = new Set([
  "5UUG83KSlqPhrBssrducWV", // Spotify
]);

function isBlocked(track: SpotifyTrack): boolean {
  return track.artists.some((a: { id?: string; name: string }) =>
    a.id ? BLOCKED_ARTIST_IDS.has(a.id) : false
  );
}

export interface PlaylistBuildResult {
  playlistId: string;
  tracks: SpotifyTrack[];
  recommendations: SpotifyTrack[];
  episodes: SpotifyEpisode[];
  uris: string[];
}

/**
 * Reorder tracks so no two consecutive tracks share the same primary artist.
 * Greedy: always pick the next track whose artist differs from the last placed.
 */
function spreadArtists(tracks: SpotifyTrack[]): SpotifyTrack[] {
  const result: SpotifyTrack[] = [];
  const remaining = [...tracks];

  while (remaining.length > 0) {
    const lastArtist = result.at(-1)?.artists[0]?.name;
    const idx = remaining.findIndex((t) => t.artists[0]?.name !== lastArtist);
    if (idx === -1) {
      // Can't avoid consecutive — just take next
      result.push(remaining.shift()!);
    } else {
      result.push(...remaining.splice(idx, 1));
    }
  }

  return result;
}

/**
 * Interleave tracks and episodes: 2 tracks → episode → 2 tracks → episode → ...
 * Remaining tracks go at the end.
 */
function interleave(tracks: SpotifyTrack[], episodes: SpotifyEpisode[]): string[] {
  const result: string[] = [];
  let ti = 0;
  let ei = 0;

  while (ti < tracks.length || ei < episodes.length) {
    // 2 tracks
    for (let i = 0; i < 2 && ti < tracks.length; i++, ti++) {
      result.push(tracks[ti].uri);
    }
    // 1 episode
    if (ei < episodes.length) {
      result.push(episodes[ei++].uri);
    } else {
      // No more episodes — flush remaining tracks
      while (ti < tracks.length) result.push(tracks[ti++].uri);
    }
  }

  return result;
}

export async function buildPlaylist(
  accessToken: string,
  existingPlaylistId: string | null,
  log: (msg: string) => void = console.log,
  extraShowIds: string[] = [],
  playlistName: string = "🚗 Daily Drive",
  targetDuration: number = 60,
  blockedTrackUris: string[] = [],
  discoveryRatio: number = 0.33,
  appUrl?: string
): Promise<PlaylistBuildResult> {
  const trackTarget = 10;
  const comfortTarget = Math.round(trackTarget * (1 - discoveryRatio));
  const discoveryTarget = trackTarget - comfortTarget;
  const blockedUriSet = new Set(blockedTrackUris);

  log("Fetching Spotify profile...");
  const profile = await getSpotifyProfile(accessToken);

  log("Fetching recently played tracks...");
  const recentTracksRaw = await getRecentlyPlayed(accessToken);
  const recentTracks = recentTracksRaw.filter((t) => !blockedUriSet.has(t.uri));

  log("Fetching top tracks...");
  const topTracksRaw = await getTopTracks(accessToken);
  const topTracks = topTracksRaw.filter((t) => !blockedUriSet.has(t.uri));

  // Deduplicate + max 2 tracks per artist
  const seen = new Set<string>();
  const artistCount = new Map<string, number>();
  const combined: SpotifyTrack[] = [];

  for (const track of [...recentTracks, ...topTracks]) {
    if (seen.has(track.id)) continue;
    if (isBlocked(track)) continue;
    const artist = track.artists[0]?.name ?? "";
    if ((artistCount.get(artist) ?? 0) >= 2) continue;
    if (combined.length >= comfortTarget) break;

    seen.add(track.id);
    artistCount.set(artist, (artistCount.get(artist) ?? 0) + 1);
    combined.push(track);
  }

  log(`Got ${combined.length} unique tracks (max 2/artist)`);

  // Discovery tracks (also capped per artist)
  log("Fetching discovery tracks (medium-term top)...");
  const discoveryCandidatesRaw = await getDiscoveryTracks(accessToken, seen);
  const discoveryCandidates = discoveryCandidatesRaw.filter((t) => !blockedUriSet.has(t.uri));
  const discovery: SpotifyTrack[] = [];
  for (const track of discoveryCandidates) {
    if (isBlocked(track)) continue;
    if (discovery.length >= discoveryTarget) break;
    const artist = track.artists[0]?.name ?? "";
    if ((artistCount.get(artist) ?? 0) >= 2) continue;
    artistCount.set(artist, (artistCount.get(artist) ?? 0) + 1);
    seen.add(track.id);
    discovery.push(track);
  }
  log(`Got ${discovery.length} discovery tracks`);

  // Spread artists to avoid consecutive same artist
  let allTracks = spreadArtists([...combined, ...discovery]);

  // Podcasts: score shows by engagement, pick top 4 unplayed episodes
  log("Fetching and scoring shows...");
  const scoredShows = await getShowsWithEpisodes(accessToken, extraShowIds);
  let episodes: SpotifyEpisode[] = [];

  for (const { show, score, latestUnplayed } of scoredShows) {
    if (episodes.length >= 4) break;
    if (latestUnplayed) {
      log(`  [score:${score}] "${latestUnplayed.name}" — ${show.name}`);
      episodes.push(latestUnplayed);
    }
  }

  log(`Got ${episodes.length} podcast episodes`);

  // Trim to targetDuration
  const targetMs = targetDuration * 60 * 1000;
  let runningMs = 0;
  const trimmedTracks: SpotifyTrack[] = [];
  for (const track of allTracks) {
    if (runningMs + track.duration_ms > targetMs) break;
    trimmedTracks.push(track);
    runningMs += track.duration_ms;
  }
  allTracks = trimmedTracks;

  const trimmedEpisodes: SpotifyEpisode[] = [];
  for (const episode of episodes) {
    if (runningMs + episode.duration_ms > targetMs) break;
    trimmedEpisodes.push(episode);
    runningMs += episode.duration_ms;
  }
  episodes = trimmedEpisodes;

  const uris = interleave(allTracks, episodes);
  log(`Total items in playlist: ${uris.length}`);

  const playlistId = await getOrCreatePlaylist(
    accessToken,
    profile.id,
    existingPlaylistId,
    playlistName
  );
  log(`Using playlist: ${playlistId}`);

  log("Clearing playlist...");
  await clearPlaylist(accessToken, playlistId);

  log("Syncing playlist name and description...");
  await updatePlaylistDetails(accessToken, playlistId, playlistName, appUrl);

  log("Adding tracks and episodes...");
  await addTracksToPlaylist(accessToken, playlistId, uris);

  log("Done!");

  return {
    playlistId,
    tracks: combined,
    recommendations: discovery,
    episodes,
    uris,
  };
}
