"use client";

import { useState } from "react";

interface SettingsPanelProps {
  targetDuration: number;
  activeDays: string;
  discoveryRatio: number;
  saveAction: (data: Partial<{ targetDuration: number; activeDays: string; discoveryRatio: number }>) => Promise<void>;
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
}

// Day labels: index = day number (0=Sun, 1=Mon, ..., 6=Sat)
// Display order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS: Record<number, string> = {
  1: "M",
  2: "T",
  3: "W",
  4: "T",
  5: "F",
  6: "S",
  0: "S",
};

export default function SettingsPanel({
  targetDuration,
  activeDays,
  discoveryRatio,
  saveAction,
}: SettingsPanelProps) {
  const [duration, setDuration] = useState(targetDuration);
  const [days, setDays] = useState<Set<number>>(
    () => new Set(activeDays.split(",").map(Number).filter((n) => !isNaN(n)))
  );
  const [ratio, setRatio] = useState(discoveryRatio);

  function toggleDay(day: number) {
    const next = new Set(days);
    if (next.has(day)) {
      next.delete(day);
    } else {
      next.add(day);
    }
    setDays(next);
    const value = DAY_ORDER.filter((d) => next.has(d)).join(",");
    saveAction({ activeDays: value });
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Number(e.target.value);
    setDuration(val);
    saveAction({ targetDuration: val });
  }

  function handleRatioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.round(Number(e.target.value) * 10) / 10;
    setRatio(val);
    saveAction({ discoveryRatio: val });
  }

  return (
    <div className="bg-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold mb-5">Settings</h2>

      {/* Duration slider */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Target duration</label>
          <span className="text-sm text-spotify-green font-semibold">
            {formatDurationLabel(duration)}
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={120}
          step={15}
          value={duration}
          onChange={handleDurationChange}
          className="w-full accent-spotify-green"
        />
        <div className="flex justify-between text-xs text-spotify-lightgray mt-1">
          <span>15 min</span>
          <span>2h</span>
        </div>
      </div>

      {/* Active days */}
      <div className="mb-6">
        <label className="text-sm font-medium block mb-2">Active days</label>
        <div className="flex gap-2">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors ${
                days.has(day)
                  ? "bg-spotify-green text-black"
                  : "bg-white/10 text-spotify-lightgray hover:bg-white/20"
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Discovery ratio slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">Discovery ratio</label>
          <span className="text-sm text-spotify-green font-semibold">
            {Math.round(ratio * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={ratio}
          onChange={handleRatioChange}
          className="w-full accent-spotify-green"
        />
        <div className="flex justify-between text-xs text-spotify-lightgray mt-1">
          <span>Familiar</span>
          <span>Discovery</span>
        </div>
      </div>
    </div>
  );
}
