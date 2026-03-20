import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-surface flex flex-col">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">

        {/* Alpha badge */}
        <span className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-xs font-black tracking-widest uppercase px-4 py-1.5 rounded-full mb-10">
          Alpha
        </span>

        {/* Car emoji with glow */}
        <div className="text-7xl mb-8 drop-shadow-[0_0_40px_rgba(29,185,84,0.4)]">
          🚗
        </div>

        <h1 className="font-headline text-6xl font-bold tracking-tight mb-4 text-on-surface">
          Daily Drive
        </h1>

        <p className="text-on-surface-variant text-xl max-w-lg mb-3 leading-relaxed">
          Spotify killed Daily Drive in 2026.
        </p>
        <p className="text-on-surface-variant text-lg max-w-lg mb-12 leading-relaxed">
          This brings it back — a fresh playlist of your music and podcast episodes, rebuilt every morning.
        </p>

        {/* CTA */}
        <form
          action={async () => {
            "use server";
            await signIn("spotify", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="btn-primary text-base font-bold py-4 px-10 rounded-full shadow-[0_0_40px_rgba(29,185,84,0.25)] hover:shadow-[0_0_60px_rgba(29,185,84,0.4)] transition-shadow"
          >
            Connect Spotify
          </button>
        </form>

        <p className="text-on-surface-variant/50 text-sm mt-5">
          Creates a private playlist in your Spotify library, updated daily.
        </p>
      </div>

      {/* Feature strip */}
      <div className="bg-surface-low border-t border-outline-variant/20">
        <div className="max-w-3xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-2xl mb-3">🎵</div>
            <p className="font-headline font-semibold text-sm text-on-surface mb-1">Your music</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">Recent plays and top tracks, no consecutive same artist</p>
          </div>
          <div>
            <div className="text-2xl mb-3">🎙</div>
            <p className="font-headline font-semibold text-sm text-on-surface mb-1">Podcast episodes</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">Short unplayed episodes from the shows you follow most</p>
          </div>
          <div>
            <div className="text-2xl mb-3">⚙️</div>
            <p className="font-headline font-semibold text-sm text-on-surface mb-1">Fully configurable</p>
            <p className="text-on-surface-variant text-xs leading-relaxed">Duration, active days, discovery ratio, blacklist</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-surface-lowest py-6 px-6 text-center">
        <p className="text-on-surface-variant/40 text-xs leading-relaxed">
          Independent open-source project, not affiliated with Spotify. Still in active development — expect rough edges.{" "}
          <a
            href="https://github.com/pvignau/daily-drive"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-on-surface-variant transition-colors"
          >
            View on GitHub
          </a>
        </p>
      </div>

    </main>
  );
}
