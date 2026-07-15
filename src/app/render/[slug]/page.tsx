"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import type { Project } from "@/lib/types";
import { Overlay } from "@/components/overlay/Overlay";

// Headless render page consumed by Puppeteer. The page exposes two globals so
// the renderer can step time programmatically and signal readiness, instead of
// relying on screencast/timing heuristics.
//
//   window.__OVERLAY_READY = true       // set when project data has loaded
//   window.__setOverlayTime(t: number)  // synchronous; React re-renders this frame
declare global {
  interface Window {
    __OVERLAY_READY?: boolean;
    __setOverlayTime?: (t: number) => void;
  }
}

export default function RenderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [time, setTime] = useState(0);

  useEffect(() => {
    fetch(`/api/projects/${slug}/json`)
      .then((r) => r.json())
      .then((p: Project) => {
        setProject(p);
        window.__OVERLAY_READY = true;
      });
    window.__setOverlayTime = (t: number) => setTime(t);
  }, [slug]);

  if (!project) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0,
        width: 1920, height: 1080,
        background: "transparent",
      }}
    >
      <Overlay project={project} time={time} />
    </div>
  );
}
