"use client";

import { useState } from "react";

function safeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith("scdn.co") || hostname.endsWith("spotifycdn.com") ? url : undefined;
  } catch {
    return undefined;
  }
}

function parseShowId(input: string): string | null {
  // Accept full URL: https://open.spotify.com/show/4wMWrabr79pA104WEAkcH3
  // or bare ID: 4wMWrabr79pA104WEAkcH3
  const match = input.match(/show\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]{22}$/.test(input.trim())) return input.trim();
  return null;
}

export default function ExtraShows({
  shows,
  addAction,
  removeAction,
}: {
  shows: { id: string; name: string; imageUrl?: string }[];
  addAction: (id: string) => Promise<{ error?: string; name?: string; imageUrl?: string }>;
  removeAction: (id: string) => Promise<void>;
}) {
  const [items, setItems] = useState(shows);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    const id = parseShowId(input);
    if (!id) { setError("Invalid URL or ID"); return; }
    if (items.some((s) => s.id === id)) { setError("Already in the list"); return; }

    setLoading(true);
    setError("");
    const result = await addAction(id);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setItems((prev) => [...prev, { id, name: result.name ?? id, imageUrl: result.imageUrl }]);
      setInput("");
    }
  }

  async function handleRemove(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    await removeAction(id);
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold mb-1">Extra podcasts</h2>
      <p className="text-spotify-lightgray text-sm mb-4">
        Podcasts you listen to without having saved them in your library.
      </p>

      {items.length > 0 && (
        <ul className="mb-4 space-y-2">
          {items.map((show) => (
            <li key={show.id} className="flex items-center justify-between gap-3 text-sm">
              {show.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeImageUrl(show.imageUrl)} alt="" className="w-9 h-9 rounded shrink-0 object-cover" />
              ) : (
                <div className="w-9 h-9 rounded bg-white/10 shrink-0 flex items-center justify-center text-base">🎙</div>
              )}
              <span className="truncate flex-1">{show.name}</span>
              <button
                onClick={() => handleRemove(show.id)}
                className="text-spotify-gray hover:text-white shrink-0 transition-colors"
                aria-label="Remove"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Spotify podcast URL or ID"
          className="flex-1 bg-white/10 rounded-full px-4 py-1.5 text-sm placeholder-spotify-gray focus:outline-none focus:ring-1 focus:ring-spotify-green"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !input}
          className="bg-spotify-green hover:bg-green-400 disabled:opacity-50 text-black font-bold px-4 py-1.5 rounded-full text-sm transition-colors"
        >
          {loading ? "..." : "Add"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
