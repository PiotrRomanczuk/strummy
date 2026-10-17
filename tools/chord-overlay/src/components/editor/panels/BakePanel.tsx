"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Panel } from "../ui/Panel";
import type { BakeStatus } from "@/lib/bakeStatus";

interface Props {
  slug: string;
  baked: boolean;
  markerCount: number;
  onBaked: () => void;
}

type UiPhase = "idle" | "running" | "done" | "error";

export function BakePanel({ slug, baked, markerCount, onBaked }: Props) {
  const [phase, setPhase] = useState<UiPhase>(baked ? "done" : "idle");
  const [status, setStatus] = useState<BakeStatus | null>(null);
  const [error, setError] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const onBake = useCallback(async () => {
    setPhase("running");
    setError("");
    setStatus(null);

    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/projects/${slug}/bake-status`, { cache: "no-store" });
        if (r.ok) setStatus((await r.json()) as BakeStatus);
      } catch { /* ignore poll errors */ }
    }, 750);

    try {
      const res = await fetch(`/api/projects/${slug}/bake`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) throw new Error(data.message ?? "Bake failed");
      setPhase("done");
      onBaked();
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopPolling();
    }
  }, [slug, onBaked, stopPolling]);

  return (
    <Panel title="Bake">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBake}
          disabled={phase === "running" || markerCount === 0}
          className="rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 hover:bg-orange-500"
        >
          {phase === "running" ? "Baking…" : "Bake to TikTok mp4"}
        </button>
        {baked && (
          <a
            href={`/api/projects/${slug}/output`}
            className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-stone-400"
            download
          >Download</a>
        )}
      </div>
      <BakeMessage phase={phase} status={status} error={error} markerCount={markerCount} />
    </Panel>
  );
}

function BakeMessage({
  phase, status, error, markerCount,
}: { phase: UiPhase; status: BakeStatus | null; error: string; markerCount: number }) {
  if (markerCount === 0) {
    return <p className="mt-2 text-xs text-stone-500">Add at least one marker before baking.</p>;
  }
  if (phase === "error") {
    return <p className="mt-2 font-mono text-xs text-red-600">{error}</p>;
  }
  if (phase === "running" && status) {
    const pct = status.framesTotal > 0
      ? Math.floor((status.framesDone / status.framesTotal) * 100)
      : 0;
    const label =
      status.phase === "rendering" ? `Rendering ${status.framesDone}/${status.framesTotal} (${pct}%)`
      : status.phase === "encoding-overlay" ? "Encoding overlay…"
      : status.phase === "compositing" ? "Compositing final mp4…"
      : "Starting…";
    return <p className="mt-2 font-mono text-xs text-stone-500">{label}</p>;
  }
  if (phase === "done") {
    return <p className="mt-2 font-mono text-xs text-emerald-700">Done. Download below.</p>;
  }
  return null;
}
