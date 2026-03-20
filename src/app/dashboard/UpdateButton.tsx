"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UpdateButton({ action }: { action: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      await action();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="bg-spotify-green hover:bg-green-400 disabled:opacity-60 disabled:cursor-not-allowed text-black font-bold py-2 px-6 rounded-full transition-colors flex items-center gap-2"
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {loading ? "Updating..." : "Update now"}
    </button>
  );
}
