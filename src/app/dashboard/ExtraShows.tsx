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
    <div className="bg-surface-low rounded-2xl p-6 mb-6">
      <h2 className="font-headline text-lg font-semibold mb-1 text-on-surface">Extra podcasts</h2>
      <p className="text-on-surface-variant text-sm mb-4">
        Podcasts you listen to without having saved them in your library.
      </p>

      {items.length > 0 && (
        <ul className="mb-4 space-y-2">
          {items.map((show) => (
            <li key={show.id} className="flex items-center justify-between gap-3 text-sm py-1">
              {safeImageUrl(show.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={safeImageUrl(show.imageUrl)} alt="" className="w-9 h-9 rounded-DEFAULT shrink-0 object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-DEFAULT bg-surface-high shrink-0 flex items-center justify-center text-base">🎙</div>
              )}
              <span className="truncate flex-1 text-on-surface">{show.name}</span>
              <button
                onClick={() => handleRemove(show.id)}
                className="text-on-surface-variant/50 hover:text-on-surface shrink-0 transition-colors text-lg leading-none"
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
          className="flex-1 bg-surface-container rounded-full px-4 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleAdd}
          disabled={loading || !input}
          className="btn-primary disabled:opacity-50 px-5 py-2 text-sm"
        >
          {loading ? "..." : "Add"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
