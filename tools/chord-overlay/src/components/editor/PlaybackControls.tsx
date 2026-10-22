"use client";

import { useEffect, useState, type RefObject } from "react";

const SPEEDS = [0.25, 0.5, 0.75, 1];

export function PlaybackControls({
  videoRef,
}: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const [rate, setRate] = useState(1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  const setRateAndApply = (r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-xs">
      <button type="button" onClick={() => seek(-3)} className="rounded border border-stone-200 px-2 py-1 font-mono hover:border-stone-400" title="Seek -3s">−3s</button>
      <button type="button" onClick={() => seek(-1)} className="rounded border border-stone-200 px-2 py-1 font-mono hover:border-stone-400" title="Seek -1s">−1s</button>
      <button type="button" onClick={togglePlay} className="rounded bg-orange-600 px-3 py-1 font-semibold text-white hover:bg-orange-500">
        {playing ? "Pause" : "Play"}
      </button>
      <button type="button" onClick={() => seek(1)} className="rounded border border-stone-200 px-2 py-1 font-mono hover:border-stone-400" title="Seek +1s">+1s</button>
      <div className="ml-2 flex items-center gap-1">
        <span className="text-[10px] uppercase tracking-wider text-stone-500">Speed</span>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setRateAndApply(s)}
            className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
              rate === s
                ? "bg-orange-100 text-orange-700"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >{s}×</button>
        ))}
      </div>
    </div>
  );
}
