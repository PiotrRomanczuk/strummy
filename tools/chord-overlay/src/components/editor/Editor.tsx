"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import Link from "next/link";
import type { Project, ChordMarker, ChordVoicing, ElementToggles, TabColumn, TabDisplay } from "@/lib/types";
import { parseChordSheet, uniqueChords } from "@/lib/parseChordSheet";
import { voicingFor } from "@/lib/chordLibrary";
import { nudgeAllMarkers, nudgeMarkersAfter } from "@/components/overlay/overlayState";
import { Timeline } from "./Timeline";
import { StrumPatternEditor } from "./StrumPatternEditor";
import { Panel } from "./ui/Panel";
import { SaveIndicator } from "./ui/SaveIndicator";
import { VideoStage } from "./VideoStage";
import { SheetPanel } from "./panels/SheetPanel";
import { ChunksPanel } from "./panels/ChunksPanel";
import { VariationPanel } from "./panels/VariationPanel";
import { DisplayPanel } from "./panels/DisplayPanel";
import { ElementsPanel } from "./panels/ElementsPanel";
import { VoicingsPanel } from "./panels/VoicingsPanel";
import { TabPanel } from "./panels/TabPanel";
import { BakePanel } from "./panels/BakePanel";
import { KeyboardHelp } from "./KeyboardHelp";
import { TapLagBanner } from "./TapLagBanner";
import { BulkShiftBar } from "./BulkShiftBar";
import { useProjectAutosave } from "./hooks/useProjectAutosave";
import { useVideoTime } from "./hooks/useVideoTime";
import { useMarkerKeys } from "./hooks/useMarkerKeys";
import { useMarkerActions } from "./hooks/useMarkerActions";
import { useMarkerHistory } from "./hooks/useMarkerHistory";
import { useTapLag } from "./hooks/useTapLag";

interface Props {
  initial: Project;
}

export function Editor({ initial }: Props) {
  const [project, setProject] = useState<Project>(initial);
  const [flashKey, setFlashKey] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [lagDismissed, setLagDismissed] = useState(false);
  const [tabEditing, setTabEditing] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { pending, error: saveError, retry: retrySave } = useProjectAutosave(project, initial);
  const { time, duration } = useVideoTime(videoRef);
  const { performUndo, performRedo } = useMarkerHistory(project.markers, setProject);
  const { recordTap, suggestion: lagSuggestion, clear: clearLag } = useTapLag(project.bpmDisplay);

  const seekTo = useCallback((t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }, []);

  const [retimeMsg, setRetimeMsg] = useState<{ key: number; text: string; ok: boolean } | null>(null);
  const baseActions = useMarkerActions(videoRef, setProject, (f) => {
    if (f.applied) {
      setRetimeMsg({ key: Date.now(), text: `Retimed nearest marker (${(f.delta * 1000).toFixed(0)}ms moved)`, ok: true });
    } else {
      const reason = f.delta === Infinity
        ? "No markers yet"
        : `Nearest marker is ${f.delta.toFixed(2)}s away (max ${f.tolerance.toFixed(2)}s) — press Space to insert instead`;
      setRetimeMsg({ key: Date.now(), text: reason, ok: false });
    }
  });
  const insertAtPlayhead = useCallback(() => {
    const v = videoRef.current;
    if (v) recordTap(v.currentTime);
    baseActions.insertAtPlayhead();
    setFlashKey((k) => k + 1);
  }, [baseActions, recordTap]);
  const { retimeNearestToPlayhead, deleteNearestToPlayhead } = baseActions;

  const toggleHelp = useCallback(() => setHelpOpen((o) => !o), []);

  useMarkerKeys({
    markers: project.markers,
    getTime: () => videoRef.current?.currentTime ?? 0,
    insertAtPlayhead,
    retimeNearestToPlayhead,
    deleteNearestToPlayhead,
    seekTo,
    togglePlay,
    undo: performUndo,
    redo: performRedo,
    toggleHelp,
  });

  const applyLagNudge = useCallback(() => {
    if (!lagSuggestion) return;
    setProject((p) => ({ ...p, markers: nudgeAllMarkers(p.markers, -lagSuggestion.offsetMs / 1000) }));
    clearLag();
    setLagDismissed(false);
  }, [lagSuggestion, clearLag]);

  const bulkShift = useCallback((deltaMs: number) => {
    const t = videoRef.current?.currentTime ?? 0;
    setProject((p) => ({ ...p, markers: nudgeMarkersAfter(p.markers, t, deltaMs / 1000) }));
  }, []);

  const distributeEvenly = useCallback(() => {
    setProject((p) => {
      if (p.chunks.length === 0 || duration <= 0) return p;
      const step = duration / (p.chunks.length + 1);
      const markers: ChordMarker[] = p.chunks.map((c, i) => {
        const m: ChordMarker = { id: nanoid(8), time: step * (i + 1), chord: c.chord };
        if (c.lyric) m.lyric = c.lyric;
        return m;
      });
      return { ...p, markers };
    });
  }, [duration]);

  // Sheet edits no longer rewrite markers — chunks are a *suggestion source*
  // for new taps, not a foreign key. Old markers keep their stored chord/lyric.
  const onSheetChange = useCallback((text: string) => {
    setProject((p) => {
      const chunks = parseChordSheet(text);
      const voicings: Record<string, ChordVoicing> = { ...p.voicings };
      for (const name of uniqueChords(chunks)) {
        if (!voicings[name]) voicings[name] = voicingFor(name);
      }
      return { ...p, sheetText: text, chunks, voicings };
    });
  }, []);

  const sortedMarkers = useMemo(
    () => [...project.markers].sort((a, b) => a.time - b.time),
    [project.markers],
  );
  const uniqueChordNames = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const m of project.markers) if (!seen.has(m.chord)) { seen.add(m.chord); order.push(m.chord); }
    for (const c of uniqueChords(project.chunks)) if (!seen.has(c)) { seen.add(c); order.push(c); }
    return order;
  }, [project.markers, project.chunks]);

  const patch = useCallback((p: Partial<Project>) => setProject((s) => ({ ...s, ...p })), []);
  const onMarkersChange = useCallback((markers: ChordMarker[]) => patch({ markers }), [patch]);
  const onVoicingChange = useCallback(
    (chord: string, v: ChordVoicing) => setProject((p) => ({ ...p, voicings: { ...p.voicings, [chord]: v } })),
    [],
  );
  const onElementToggle = useCallback(
    (key: keyof ElementToggles, value: boolean) =>
      setProject((p) => ({ ...p, elements: { ...p.elements, [key]: value } })),
    [],
  );
  const onTabDisplay = useCallback(
    (tabDisplay: TabDisplay) => setProject((p) => ({ ...p, tabDisplay })),
    [],
  );
  const onMarkerTab = useCallback(
    (id: string, tab: TabColumn[] | undefined) =>
      setProject((p) => ({
        ...p,
        markers: p.markers.map((m) => {
          if (m.id !== id) return m;
          const next = { ...m };
          if (tab) next.tab = tab; else delete next.tab;
          return next;
        }),
      })),
    [],
  );
  const jumpToMarkerTab = useCallback((id: string) => {
    const m = project.markers.find((x) => x.id === id);
    if (m) seekTo(m.time);
    setTabEditing(id);
  }, [project.markers, seekTo]);
  const onBaked = useCallback(
    () => patch({ baked: { outputFilename: "output.mp4", bakedAt: new Date().toISOString() } }),
    [patch],
  );

  return (
    <main className="mx-auto w-full max-w-[1700px] px-4 py-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-stone-500 transition hover:text-stone-700">← Projects</Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-stone-900">{project.title}</h1>
        </div>
        <SaveIndicator pending={pending} error={saveError} onRetry={retrySave} />
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="space-y-5">
          <VideoStage
            project={project}
            time={time}
            duration={duration}
            markerCount={sortedMarkers.length}
            videoRef={videoRef}
            flashKey={flashKey}
          />
          {lagSuggestion && !lagDismissed && (
            <TapLagBanner
              offsetMs={lagSuggestion.offsetMs}
              confidence={lagSuggestion.confidence}
              onApply={applyLagNudge}
              onDismiss={() => setLagDismissed(true)}
            />
          )}
          <Panel title="Timeline" subtitle="Pins, markers, bulk shift — always under the video">
            <div className="mb-3">
              <BulkShiftBar
                affectedCount={project.markers.filter((m) => m.time >= time).length}
                currentTime={time}
                onShift={bulkShift}
              />
            </div>
            <Timeline
              markers={sortedMarkers}
              chunks={project.chunks}
              knownChords={uniqueChordNames}
              voicings={project.voicings}
              duration={duration || 60}
              currentTime={time}
              onChange={onMarkersChange}
              onSeek={seekTo}
              onInsertAtPlayhead={insertAtPlayhead}
              tabEditing={tabEditing}
              onTabEditingChange={setTabEditing}
            />
          </Panel>
        </section>

        <section className="space-y-5">
          <SheetPanel
            text={project.sheetText}
            chunkCount={project.chunks.length}
            uniqueCount={uniqueChords(project.chunks).length}
            onChange={onSheetChange}
          />
          <ChunksPanel
            chunks={project.chunks}
            cursor={project.markers.length}
            onDistributeEvenly={distributeEvenly}
            duration={duration}
            hasMarkers={project.markers.length > 0}
          />
          <VariationPanel value={project.variation} onChange={(variation) => patch({ variation })} />
          <DisplayPanel
            watermark={project.watermark}
            bpmDisplay={project.bpmDisplay}
            capoDisplay={project.capoDisplay}
            onWatermark={(watermark) => patch({ watermark })}
            onBpm={(bpmDisplay) => patch({ bpmDisplay })}
            onCapo={(capoDisplay) => patch({ capoDisplay })}
          />
          <ElementsPanel
            elements={project.elements}
            onToggle={onElementToggle}
            tabMarkerCount={project.markers.filter((m) => m.tab && m.tab.length > 0).length}
          />
          <TabPanel
            markers={sortedMarkers}
            voicings={project.voicings}
            tabDisplay={project.tabDisplay}
            onTabDisplay={onTabDisplay}
            onTab={onMarkerTab}
            onSeek={seekTo}
            onJumpToMarker={jumpToMarkerTab}
          />
          <Panel title="Strum pattern" subtitle="8 sub-beats per chord change · click to cycle ↓ ↑ rest">
            <StrumPatternEditor pattern={project.strum} onChange={(strum) => patch({ strum })} />
          </Panel>
          <VoicingsPanel
            uniqueChords={uniqueChordNames}
            voicings={project.voicings}
            onChange={onVoicingChange}
          />
          <BakePanel
            slug={project.slug}
            baked={!!project.baked}
            markerCount={project.markers.length}
            onBaked={onBaked}
          />
        </section>
      </div>

      {helpOpen && <KeyboardHelp onClose={() => setHelpOpen(false)} />}
      {retimeMsg && <RetimeToast msg={retimeMsg} onDismiss={() => setRetimeMsg(null)} />}
    </main>
  );
}

function RetimeToast({
  msg, onDismiss,
}: {
  msg: { key: number; text: string; ok: boolean };
  onDismiss: () => void;
}) {
  return (
    <div
      key={msg.key}
      onAnimationEnd={onDismiss}
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-semibold shadow-lg ${
        msg.ok ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
      }`}
      style={{ animation: "jmg-toast 2.4s ease-out forwards" }}
    >
      {msg.text}
    </div>
  );
}
