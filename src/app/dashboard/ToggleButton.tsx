"use client";

import { useState } from "react";

export default function ToggleButton({
  paused,
  action,
}: {
  paused: boolean;
  action: () => Promise<void>;
}) {
  const [optimisticPaused, setOptimisticPaused] = useState(paused);

  async function handleClick() {
    const next = !optimisticPaused;
    setOptimisticPaused(next);
    try {
      await action();
    } catch {
      setOptimisticPaused(!next); // rollback
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        optimisticPaused
          ? "bg-spotify-green text-black hover:bg-green-400"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {optimisticPaused ? "Enable" : "Disable"}
    </button>
  );
}
