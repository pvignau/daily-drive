"use client";

import { useRef, useState } from "react";

export default function PlaylistNameEditor({
  name,
  saveAction,
}: {
  name: string;
  saveAction: (newName: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [optimisticName, setOptimisticName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(optimisticName);
    setEditing(true);
    // Focus the input after render
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === optimisticName) {
      setEditing(false);
      return;
    }
    setOptimisticName(trimmed);
    setEditing(false);
    try {
      await saveAction(trimmed);
    } catch {
      // Revert on error
      setOptimisticName(optimisticName);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="text-lg font-semibold bg-transparent border-b border-primary outline-none focus:border-primary w-full max-w-xs"
        style={{ borderTop: "none", borderLeft: "none", borderRight: "none" }}
      />
    );
  }

  return (
    <button
      onClick={startEdit}
      title="Click to edit the name"
      className="text-lg font-semibold hover:underline decoration-dotted underline-offset-4 cursor-pointer text-left"
    >
      {optimisticName}
    </button>
  );
}
