"use client";

import { useEffect, useRef, useState } from "react";

const CHARS = ["0", "1", "♩", "♪", "♫", "♬", "·", "·"];
const COLS = 13;
const ROWS = 6;
const TOTAL = COLS * ROWS;

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function UpdateAnimation({
  fetching,
  onComplete,
}: {
  fetching: boolean;
  onComplete: () => void;
}) {
  const [cells, setCells] = useState<string[]>(() =>
    Array.from({ length: TOTAL }, randomChar)
  );
  const [locked, setLocked] = useState<boolean[]>(
    Array(TOTAL).fill(false)
  );
  const [allLocked, setAllLocked] = useState(false);
  const [glowing, setGlowing] = useState(false);

  const phaseDone = useRef(false);
  const fetchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Randomize cells while fetching
  useEffect(() => {
    if (fetching) {
      fetchIntervalRef.current = setInterval(() => {
        setCells((prev) =>
          prev.map((_, i) =>
            locked[i] ? prev[i] : randomChar()
          )
        );
      }, 80);
    } else {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    }

    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching]);

  // When fetching becomes false, start locking cells one by one
  useEffect(() => {
    if (fetching || phaseDone.current) return;
    phaseDone.current = true;

    // Stop randomizing
    if (fetchIntervalRef.current) {
      clearInterval(fetchIntervalRef.current);
      fetchIntervalRef.current = null;
    }

    // Lock cells one by one, left→right, top→bottom, 12ms apart
    let i = 0;
    function lockNext() {
      if (i >= TOTAL) {
        setAllLocked(true);
        return;
      }
      const idx = i;
      i++;
      setLocked((prev) => {
        const next = [...prev];
        next[idx] = true;
        return next;
      });
      lockTimeoutRef.current = setTimeout(lockNext, 12);
    }
    lockNext();

    return () => {
      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
    };
  }, [fetching]);

  // After all cells locked: glow, hold 700ms, then onComplete
  useEffect(() => {
    if (!allLocked) return;
    setGlowing(true);
    const t = setTimeout(() => {
      onComplete();
    }, 700);
    return () => clearTimeout(t);
  }, [allLocked, onComplete]);

  // Keep randomizing non-locked cells
  useEffect(() => {
    if (!fetching) return;
    const interval = setInterval(() => {
      setCells((prev) =>
        prev.map((c, i) => (locked[i] ? c : randomChar()))
      );
    }, 80);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetching, locked]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={`bg-[#121212] rounded-2xl p-8 flex flex-col items-center gap-6 border transition-all duration-500 ${
          glowing
            ? "shadow-[0_0_80px_rgba(29,185,84,0.6)] border-spotify-green"
            : "border-white/10"
        }`}
      >
        {/* Grid */}
        <div
          className="grid gap-1 font-mono text-sm select-none"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1.5rem)`,
          }}
        >
          {cells.map((char, i) => (
            <span
              key={i}
              className={`w-6 h-6 flex items-center justify-center transition-colors duration-100 ${
                locked[i] ? "text-spotify-green" : "text-white/40"
              }`}
            >
              {char}
            </span>
          ))}
        </div>

        {/* Label */}
        <p className="text-sm font-medium tracking-widest text-white/70 uppercase">
          {fetching ? "Analyzing your listening history..." : "Compiling..."}
        </p>
      </div>
    </div>
  );
}
