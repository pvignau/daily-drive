"use client";

import { useState } from "react";
import type { PlaylistItem } from "@/lib/spotify";

function safeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith("scdn.co") || hostname.endsWith("spotifycdn.com") ? url : undefined;
  } catch {
    return undefined;
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PlaylistItemsProps {
  items: PlaylistItem[];
  blockAction: (uri: string) => Promise<void>;
}

export default function PlaylistItems({ items, blockAction }: PlaylistItemsProps) {
  const [visible, setVisible] = useState<PlaylistItem[]>(items);

  async function handleBlock(uri: string) {
    // Optimistically remove
    setVisible((prev) => prev.filter((i) => i.uri !== uri));
    await blockAction(uri);
  }

  return (
    <ol className="space-y-1">
      {visible.map((item, i) => (
        <li
          key={item.uri}
          className="group flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {/* Podcast indicator */}
          <div
            className={`w-0.5 h-8 rounded-full shrink-0 ${
              item.type === "episode" ? "bg-spotify-green" : "bg-transparent"
            }`}
          />

          {/* Index */}
          <span className="text-spotify-gray text-xs w-5 text-right shrink-0">
            {i + 1}
          </span>

          {/* Cover */}
          {safeImageUrl(item.imageUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={safeImageUrl(item.imageUrl)}
              alt=""
              className="w-9 h-9 rounded shrink-0 object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded bg-white/10 shrink-0 flex items-center justify-center text-base">
              {item.type === "episode" ? "🎙" : "🎵"}
            </div>
          )}

          {/* Name + subtitle */}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium leading-tight">{item.name}</p>
            <p className="truncate text-xs text-spotify-lightgray leading-tight mt-0.5">
              {item.subtitle}
            </p>
          </div>

          {/* Duration */}
          <span className="text-spotify-gray text-xs shrink-0">
            {formatDuration(item.duration_ms)}
          </span>

          {/* Block button — tracks only, revealed on hover */}
          {item.type === "track" && (
            <button
              onClick={() => handleBlock(item.uri)}
              title="Exclude this track"
              className="opacity-0 group-hover:opacity-100 text-spotify-gray hover:text-white text-base shrink-0 w-5 h-5 flex items-center justify-center transition-opacity"
            >
              ×
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
