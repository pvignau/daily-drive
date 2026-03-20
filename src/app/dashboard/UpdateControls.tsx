"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UpdateAnimation from "./UpdateAnimation";

export default function UpdateControls({
  paused,
  toggleAction,
  updateAction,
}: {
  paused: boolean;
  toggleAction: () => Promise<void>;
  updateAction: () => Promise<void>;
}) {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(paused);
  const [animating, setAnimating] = useState(false);
  const [fetching, setFetching] = useState(false);

  async function handleToggle() {
    const next = !isPaused;
    setIsPaused(next);
    try {
      await toggleAction();
    } catch {
      setIsPaused(!next);
    }
  }

  async function handleUpdate() {
    setAnimating(true);
    setFetching(true);
    try {
      await updateAction();
    } finally {
      setFetching(false);
    }
  }

  function handleComplete() {
    setAnimating(false);
    router.refresh();
  }

  return (
    <>
      {animating && (
        <UpdateAnimation fetching={fetching} onComplete={handleComplete} />
      )}

      <div className="bg-white/5 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">Automatic updates</h2>
            <p className="text-spotify-lightgray text-sm">
              {isPaused
                ? "Daily updates are disabled."
                : "The playlist is updated every morning at 6 AM UTC."}
            </p>
          </div>

          <button
            role="switch"
            aria-checked={!isPaused}
            onClick={handleToggle}
            className="shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
            style={{ backgroundColor: isPaused ? "#535353" : "#1DB954" }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isPaused ? "translate-x-1" : "translate-x-6"
              }`}
            />
          </button>
        </div>

        {!isPaused && (
          <button
            onClick={handleUpdate}
            disabled={animating}
            className="bg-spotify-green hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
          >
            {animating && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {animating ? "Updating..." : "Update now"}
          </button>
        )}
      </div>
    </>
  );
}
