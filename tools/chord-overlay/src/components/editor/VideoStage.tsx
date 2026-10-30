"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Project } from "@/lib/types";
import { Overlay } from "@/components/overlay/Overlay";
import { PlaybackControls } from "./PlaybackControls";

export function VideoStage({
  project, time, duration, markerCount, videoRef, flashKey,
}: {
  project: Project;
  time: number;
  duration: number;
  markerCount: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  flashKey: number;
}) {
  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black ring-1 ring-stone-200 shadow-sm">
        <video
          ref={videoRef}
          src={`/api/projects/${project.slug}/source`}
          className="absolute inset-0 h-full w-full object-cover"
          controls
          playsInline
        />
        <div className="pointer-events-none absolute inset-0">
          <ScaledOverlay project={project} time={time} />
        </div>
        <InsertFlash flashKey={flashKey} />
      </div>
      <PlaybackControls videoRef={videoRef} />
      <div className="mt-2 flex items-center justify-between font-mono text-xs text-stone-500">
        <span>t = {time.toFixed(2)}s {duration > 0 && `/ ${duration.toFixed(2)}s`}</span>
        <span>{markerCount} markers · {project.chunks.length} chunks</span>
      </div>
      <div className="mt-1 text-center font-mono text-[10px] uppercase tracking-wider text-stone-400">
        press <kbd className="rounded bg-stone-200 px-1.5 py-0.5 text-stone-700">Space</kbd> on each chord change
      </div>
    </div>
  );
}

// 220ms orange ring on every marker insert. flashKey is a counter the parent
// bumps on each insert; we rerun the animation by remounting via key.
function InsertFlash({ flashKey }: { flashKey: number }) {
  if (flashKey === 0) return null;
  return (
    <div
      key={flashKey}
      className="pointer-events-none absolute inset-0 rounded-lg ring-4 ring-orange-500/70"
      style={{ animation: "jmg-flash 220ms ease-out forwards" }}
    />
  );
}

function ScaledOverlay({ project, time }: { project: Project; time: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const parent = el.parentElement;
      if (!parent) return;
      setScale(parent.clientWidth / 1920);
    };
    update();
    const ro = new ResizeObserver(update);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        width: 1920, height: 1080,
        transform: `scale(${scale})`, transformOrigin: "top left",
        position: "absolute", top: 0, left: 0,
      }}
    >
      <Overlay project={project} time={time} />
    </div>
  );
}
