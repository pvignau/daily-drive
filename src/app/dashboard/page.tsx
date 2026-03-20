import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getPlaylistItems, refreshAccessToken, updatePlaylistDetails, type PlaylistItem } from "@/lib/spotify";
import { runUpdateForUser } from "@/lib/user-update";
import UpdateControls from "./UpdateControls";
import CopyTokenButton from "./CopyTokenButton";
import ExtraShows from "./ExtraShows";
import { getShowById } from "@/lib/spotify";
import PlaylistNameEditor from "./PlaylistNameEditor";
import SettingsPanel from "./SettingsPanel";
import PlaylistItems from "./PlaylistItems";

async function addExtraShow(
  spotifyId: string,
  showId: string,
  accessToken: string
): Promise<{ error?: string; name?: string; imageUrl?: string }> {
  "use server";
  const show = await getShowById(accessToken, showId);
  if (!show) return { error: "Show not found on Spotify" };

  const user = await prisma.user.findUnique({ where: { spotifyId } });
  const items: { id: string; name: string; imageUrl?: string }[] = JSON.parse(user?.extraShows ?? "[]");
  if (!items.find((s) => s.id === showId)) {
    const imageUrl = show.images?.[0]?.url;
    await prisma.user.update({
      where: { spotifyId },
      data: { extraShows: JSON.stringify([...items, { id: showId, name: show.name, imageUrl }]) },
    });
  }
  revalidatePath("/dashboard");
  return { name: show.name, imageUrl: show.images?.[0]?.url };
}

async function removeExtraShow(spotifyId: string, showId: string) {
  "use server";
  const user = await prisma.user.findUnique({ where: { spotifyId } });
  const items: { id: string; name: string }[] = JSON.parse(user?.extraShows ?? "[]");
  await prisma.user.update({
    where: { spotifyId },
    data: { extraShows: JSON.stringify(items.filter((s) => s.id !== showId)) },
  });
  revalidatePath("/dashboard");
}

async function togglePause(spotifyId: string, pause: boolean) {
  "use server";
  await prisma.user.update({ where: { spotifyId }, data: { pauseUpdates: pause } });
  revalidatePath("/dashboard");
}

async function triggerUpdate() {
  "use server";
  const session = await auth();
  if (!session?.user?.spotifyId) throw new Error("Not authenticated");
  // VULN-03: only rebuild the current user's playlist, not all users
  await runUpdateForUser(session.user.spotifyId);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function totalDuration(items: PlaylistItem[]): string {
  const total = items.reduce((sum, i) => sum + i.duration_ms, 0);
  const minutes = Math.floor(total / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h${String(mins).padStart(2, "0")}` : `${mins} min`;
}

export default async function Dashboard() {
  const session = await auth();

  if (!session?.user?.spotifyId) {
    redirect("/");
  }

  let user = await prisma.user.findUnique({
    where: { spotifyId: session.user.spotifyId },
  });

  if (!user) redirect("/");

  // Refresh token if needed
  let accessToken = user!.accessToken;
  if (new Date(user!.tokenExpiry) < new Date(Date.now() + 5 * 60 * 1000)) {
    const refreshed = await refreshAccessToken(user!.refreshToken);
    accessToken = refreshed.accessToken;
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenExpiry: refreshed.tokenExpiry,
      },
    });
  }

  // Fetch playlist content
  let playlistItems: PlaylistItem[] = [];
  if (user!.playlistId) {
    try {
      playlistItems = await getPlaylistItems(accessToken, user!.playlistId);
    } catch {
      // Playlist might have been deleted — ignore
    }
  }

  const tracks = playlistItems.filter((i) => i.type === "track");
  const episodes = playlistItems.filter((i) => i.type === "episode");

  const lastRunText = user!.lastRun
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(user!.lastRun)
    : "Never";

  async function updatePlaylistName(newName: string) {
    "use server";
    // VULN-12: length + empty validation
    const trimmed = newName.trim().slice(0, 100);
    if (!trimmed) return;

    const spotifyId = session!.user.spotifyId!;
    const currentUser = await prisma.user.findUnique({ where: { spotifyId } });
    if (!currentUser) return;

    await prisma.user.update({ where: { spotifyId }, data: { playlistName: trimmed } });

    if (currentUser.playlistId) {
      // VULN-10: refresh token if expired before using it
      let { accessToken, refreshToken, tokenExpiry } = currentUser;
      if (new Date(tokenExpiry) < new Date(Date.now() + 5 * 60 * 1000)) {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        await prisma.user.update({
          where: { spotifyId },
          data: { accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken, tokenExpiry: refreshed.tokenExpiry },
        });
      }
      await updatePlaylistDetails(accessToken, currentUser.playlistId, trimmed);
    }

    revalidatePath("/dashboard");
  }

  async function blockTrack(uri: string) {
    "use server";
    const spotifyId = session!.user.spotifyId!;
    const u = await prisma.user.findUnique({ where: { spotifyId } });
    const uris: string[] = JSON.parse(u?.blockedTrackUris ?? "[]");
    if (!uris.includes(uri)) {
      await prisma.user.update({
        where: { spotifyId },
        data: { blockedTrackUris: JSON.stringify([...uris, uri]) },
      });
    }
    revalidatePath("/dashboard");
  }

  async function saveSettings(data: Partial<{ targetDuration: number; activeDays: string; discoveryRatio: number }>) {
    "use server";
    // VULN-02: whitelist and validate each field to prevent mass-assignment
    const safe: { targetDuration?: number; activeDays?: string; discoveryRatio?: number } = {};
    if (typeof data.targetDuration === "number") {
      safe.targetDuration = Math.min(Math.max(Math.round(data.targetDuration), 15), 120);
    }
    // VULN-04: validate activeDays format
    if (typeof data.activeDays === "string" && /^[0-6](,[0-6])*$|^$/.test(data.activeDays)) {
      safe.activeDays = data.activeDays;
    }
    if (typeof data.discoveryRatio === "number") {
      safe.discoveryRatio = Math.min(Math.max(Math.round(data.discoveryRatio * 10) / 10, 0), 1);
    }
    if (Object.keys(safe).length === 0) return;
    await prisma.user.update({
      where: { spotifyId: session!.user.spotifyId! },
      data: safe,
    });
    revalidatePath("/dashboard");
  }

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚗</span>
            <h1 className="text-2xl font-bold">Daily Drive</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-spotify-lightgray hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        {/* User + status */}
        <div className="bg-white/5 rounded-2xl p-6 mb-6">
          <p className="text-spotify-lightgray text-sm mb-1">Signed in as</p>
          <p className="text-xl font-semibold mb-4">
            {user!.displayName ?? user!.email ?? user!.spotifyId}
          </p>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm mb-3">
            <div>
              <span className="text-spotify-lightgray">Last updated </span>
              <span className="font-medium">{lastRunText}</span>
            </div>
            {user!.playlistId && (
              <a
                href={`https://open.spotify.com/playlist/${user!.playlistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-spotify-green hover:underline font-medium"
              >
                Open in Spotify ↗
              </a>
            )}
          </div>
          {process.env.NODE_ENV === "development" && (
            // VULN-09: token fetched on demand via server action, not embedded in page HTML
            <CopyTokenButton getToken={async () => {
              "use server";
              const u = await prisma.user.findUnique({ where: { spotifyId: session!.user.spotifyId! } });
              return u?.refreshToken ?? "";
            }} />
          )}
        </div>

        <ExtraShows
          shows={JSON.parse(user!.extraShows || "[]")}
          addAction={async (id) => {
            "use server";
            return addExtraShow(session.user.spotifyId!, id, accessToken);
          }}
          removeAction={async (id) => {
            "use server";
            await removeExtraShow(session.user.spotifyId!, id);
          }}
        />

        <SettingsPanel
          targetDuration={user!.targetDuration}
          activeDays={user!.activeDays}
          discoveryRatio={user!.discoveryRatio}
          saveAction={saveSettings}
        />

        <UpdateControls
          paused={user!.pauseUpdates}
          toggleAction={async () => {
            "use server";
            await togglePause(session.user.spotifyId!, !user!.pauseUpdates);
          }}
          updateAction={triggerUpdate}
        />

        {/* Playlist content */}
        {playlistItems.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <PlaylistNameEditor
                name={user!.playlistName}
                saveAction={updatePlaylistName}
              />
              <span className="text-spotify-lightgray text-sm">
                {playlistItems.length} tracks · {totalDuration(playlistItems)}
              </span>
            </div>

            {/* Stats */}
            <div className="flex gap-4 mb-5 text-sm">
              <span className="bg-white/10 rounded-full px-3 py-1">
                🎵 {tracks.length} songs
              </span>
              <span className="bg-white/10 rounded-full px-3 py-1">
                🎙 {episodes.length} podcast episodes
              </span>
            </div>

            {/* Items list */}
            <PlaylistItems items={playlistItems} blockAction={blockTrack} />
          </div>
        )}

      </div>
    </main>
  );
}
