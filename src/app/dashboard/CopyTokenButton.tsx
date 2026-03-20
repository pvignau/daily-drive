"use client";

import { useState } from "react";

export default function CopyTokenButton({ getToken }: { getToken: () => Promise<string> }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const token = await getToken();
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-spotify-gray hover:text-white transition-colors"
    >
      {copied ? "✓ Copied" : "📋 Copy refresh token"}
    </button>
  );
}
