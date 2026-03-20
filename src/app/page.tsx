import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center max-w-md">

        {/* Alpha badge */}
        <span className="inline-block bg-spotify-green text-black text-sm font-black tracking-widest uppercase px-4 py-1.5 rounded-full mb-6">
          Alpha
        </span>

        <div className="text-6xl mb-6">🚗</div>
        <h1 className="text-4xl font-bold mb-3">Daily Drive</h1>
        <p className="text-spotify-lightgray text-lg mb-8">
          Spotify killed Daily Drive in 2026. This brings it back — a fresh
          playlist of your music and podcast episodes, rebuilt every morning.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("spotify", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="bg-spotify-green hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full text-lg transition-colors"
          >
            Connect Spotify
          </button>
        </form>

        <p className="text-spotify-gray text-sm mt-6">
          We&apos;ll create a playlist in your Spotify account and update it
          daily.
        </p>

        {/* Disclaimer */}
        <p className="text-spotify-gray/60 text-xs mt-10 leading-relaxed">
          This is an independent open-source project, not affiliated with Spotify.
          It&apos;s still in active development — expect rough edges.{" "}
          <a
            href="https://github.com/pvignau/daily-drive"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-spotify-gray transition-colors"
          >
            View on GitHub
          </a>
        </p>
      </div>
    </main>
  );
}
