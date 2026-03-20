export interface SpotifyTrack {
  uri: string;
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  duration_ms: number;
  is_playable?: boolean;
  restrictions?: { reason: string };
}

function isPlayable(track: SpotifyTrack): boolean {
  if (track.restrictions?.reason) return false;
  if (track.is_playable === false) return false;
  return true;
}

export interface SpotifyEpisode {
  uri: string;
  id: string;
  name: string;
  show: { name: string };
  duration_ms: number;
  release_date: string;
  resume_point?: { fully_played: boolean; resume_position_ms: number };
}

export interface SpotifyShow {
  id: string;
  name: string;
  images?: { url: string }[];
}

export interface TokenRefreshResult {
  accessToken: string;
  tokenExpiry: Date;
}

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenRefreshResult & { refreshToken: string }> {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function spotifyFetch<T>(
  accessToken: string,
  path: string,
  options?: RequestInit
): Promise<T> {
  if (path.startsWith("http")) {
    const { hostname } = new URL(path);
    if (!hostname.endsWith("spotify.com")) {
      throw new Error(`Blocked request to untrusted host: ${hostname}`);
    }
  }
  const url = path.startsWith("http") ? path : `${SPOTIFY_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify API error ${response.status} on ${path}: ${text}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text);
}

export async function getRecentlyPlayed(
  accessToken: string
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{
    items: { track: SpotifyTrack }[];
  }>(accessToken, "/me/player/recently-played?limit=50");

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const item of data.items) {
    if (!seen.has(item.track.id)) {
      seen.add(item.track.id);
      ids.push(item.track.id);
    }
  }
  return batchGetTracks(accessToken, ids);
}

export async function batchGetTracks(
  accessToken: string,
  ids: string[]
): Promise<SpotifyTrack[]> {
  const results: SpotifyTrack[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50).join(",");
    const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
      accessToken,
      `/tracks?ids=${chunk}&market=from_token`
    );
    results.push(...data.tracks.filter((t) => t && isPlayable(t)));
  }
  return results;
}

export async function getTopTracks(accessToken: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    accessToken,
    "/me/top/tracks?time_range=short_term&limit=10&market=from_token"
  );
  return data.items.filter(isPlayable);
}

export async function getDiscoveryTracks(
  accessToken: string,
  excludeIds: Set<string>
): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ items: SpotifyTrack[] }>(
    accessToken,
    "/me/top/tracks?time_range=medium_term&limit=20&market=from_token"
  );
  return data.items.filter((t) => !excludeIds.has(t.id) && isPlayable(t)).slice(0, 5);
}

export async function getFollowedShows(
  accessToken: string
): Promise<SpotifyShow[]> {
  const shows: SpotifyShow[] = [];
  let url: string | null = "/me/shows?limit=50";

  while (url) {
    const data: { items: { show: SpotifyShow }[]; next: string | null } =
      await spotifyFetch(accessToken, url);

    shows.push(...data.items.map((item) => item.show));
    url = data.next;
  }

  return shows;
}

export interface ScoredShow {
  show: SpotifyShow;
  /** Number of recently fully-played episodes — proxy for engagement */
  score: number;
  latestUnplayed: SpotifyEpisode | null;
}

/**
 * Fetches all saved shows, scores them by listening engagement, and finds
 * the latest unplayed episode for each — all in one parallel pass.
 * Returns shows sorted by score descending (most-listened first).
 */
export async function getShowById(
  accessToken: string,
  showId: string
): Promise<SpotifyShow | null> {
  try {
    return await spotifyFetch<SpotifyShow>(accessToken, `/shows/${showId}?market=from_token`);
  } catch {
    return null;
  }
}

export async function getShowsWithEpisodes(
  accessToken: string,
  extraShowIds: string[] = []
): Promise<ScoredShow[]> {
  const followed = await getFollowedShows(accessToken);
  const followedIds = new Set(followed.map((s) => s.id));

  const extras = (
    await Promise.all(
      extraShowIds
        .filter((id) => !followedIds.has(id))
        .map((id) => getShowById(accessToken, id))
    )
  ).filter((s): s is SpotifyShow => s !== null);

  // Extras first so they're always included regardless of library size
  const shows = [...extras, ...followed];

  const results = await Promise.all(
    shows.map(async (show): Promise<ScoredShow> => {
      try {
        const data = await spotifyFetch<{ items: { id: string; release_date: string }[] }>(
          accessToken,
          `/shows/${show.id}/episodes?limit=40&market=from_token`
        );
        if (data.items.length === 0) return { show, score: 0, latestUnplayed: null };

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        const recentItems = data.items.filter(
          (e) => new Date(e.release_date) >= threeMonthsAgo
        );
        if (recentItems.length === 0) return { show, score: 0, latestUnplayed: null };

        const ids = recentItems.map((e) => e.id).join(",");
        const full = await spotifyFetch<{ episodes: SpotifyEpisode[] }>(
          accessToken,
          `/episodes?ids=${ids}&market=from_token`
        );

        const score = full.episodes.reduce((acc, e) => {
          if (!e) return acc;
          if (e.resume_point?.fully_played) return acc + 2;
          if ((e.resume_point?.resume_position_ms ?? 0) > 0) return acc + 1;
          return acc;
        }, 0);
        const MAX_EPISODE_MS = 10 * 60 * 1000; // 10 minutes
        const latestUnplayed =
          full.episodes.find((e) => e && !e.resume_point?.fully_played && e.duration_ms <= MAX_EPISODE_MS) ?? null;

        return { show, score, latestUnplayed };
      } catch {
        return { show, score: 0, latestUnplayed: null };
      }
    })
  );

  return results.sort((a, b) => b.score - a.score);
}

export interface PlaylistItem {
  type: "track" | "episode";
  uri: string;
  name: string;
  subtitle: string; // artist names or show name
  duration_ms: number;
  imageUrl?: string;
}

export async function getPlaylistItems(
  accessToken: string,
  playlistId: string
): Promise<PlaylistItem[]> {
  const data = await spotifyFetch<{
    items: {
      track: {
        type: "track" | "episode";
        uri: string;
        name: string;
        duration_ms: number;
        artists?: { name: string }[];
        show?: { name: string; images?: { url: string }[] };
        album?: { images: { url: string }[] };
        images?: { url: string }[];
      } | null;
    }[];
  }>(accessToken, `/playlists/${playlistId}/tracks?limit=100&additional_types=track,episode`);

  return data.items
    .filter((item) => item.track !== null)
    .map((item) => {
      const t = item.track!;
      return {
        type: t.type,
        uri: t.uri,
        name: t.name,
        subtitle:
          t.type === "episode"
            ? (t.show?.name ?? "Podcast")
            : (t.artists?.map((a) => a.name).join(", ") ?? ""),
        duration_ms: t.duration_ms,
        imageUrl:
          t.type === "episode"
            ? (t.show?.images?.[0]?.url ?? t.images?.[0]?.url)
            : t.album?.images?.[0]?.url,
      };
    });
}

export async function getOrCreatePlaylist(
  accessToken: string,
  userId: string,
  existingPlaylistId: string | null,
  name: string = "🚗 Daily Drive"
): Promise<string> {
  if (existingPlaylistId) {
    return existingPlaylistId;
  }

  const playlist = await spotifyFetch<{ id: string }>(
    accessToken,
    `/users/${userId}/playlists`,
    {
      method: "POST",
      body: JSON.stringify({
        name,
        description:
          "Your personalized daily mix of music and podcasts — updated every morning.",
        public: false,
      }),
    }
  );

  return playlist.id;
}

export async function updatePlaylistDetails(
  accessToken: string,
  playlistId: string,
  name: string,
  appUrl?: string
): Promise<void> {
  const description = appUrl
    ? `Your personalized daily mix of music and podcasts — updated every morning. Edit preferences: ${appUrl}/dashboard`
    : "Your personalized daily mix of music and podcasts — updated every morning.";
  await spotifyFetch(accessToken, `/playlists/${playlistId}`, {
    method: "PUT",
    body: JSON.stringify({ name, description, public: false }),
  });
}

export async function getSpotifyProfile(
  accessToken: string
): Promise<{ id: string; display_name: string; email: string }> {
  return spotifyFetch(accessToken, "/me");
}

export async function clearPlaylist(
  accessToken: string,
  playlistId: string
): Promise<void> {
  await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
    method: "PUT",
    body: JSON.stringify({ uris: [] }),
  });
}

export async function addTracksToPlaylist(
  accessToken: string,
  playlistId: string,
  uris: string[]
): Promise<void> {
  // Spotify allows max 100 items per request
  for (let i = 0; i < uris.length; i += 100) {
    const chunk = uris.slice(i, i + 100);
    await spotifyFetch(accessToken, `/playlists/${playlistId}/tracks`, {
      method: "POST",
      body: JSON.stringify({ uris: chunk }),
    });
  }
}
