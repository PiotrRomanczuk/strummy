import { DEFAULT_WATERMARK, type ChordChunk, type ChordMarker, type ChordVoicing, type Project } from "./types";
import {
  asChunk, asElements, asMarker, asNumber, asStrum, asString, asTab, asTabDisplay,
  asVariation, asVoicing, isObject,
} from "./projectSchema/parsers";

export function parseProjectJson(raw: unknown): Project {
  if (!isObject(raw)) throw new Error("project.json: root is not an object");
  const slug = asString(raw.slug);
  if (!slug) throw new Error("project.json: missing slug");
  const source = isObject(raw.source) ? raw.source : null;
  const filename = source ? asString(source.filename) : "";
  if (!filename) throw new Error("project.json: missing source.filename");

  const voicingsRaw = isObject(raw.voicings) ? raw.voicings : {};
  const voicings: Record<string, ChordVoicing> = {};
  for (const [k, v] of Object.entries(voicingsRaw)) {
    const parsed = asVoicing(v);
    if (parsed) voicings[k] = parsed;
  }

  const chunks: ChordChunk[] = Array.isArray(raw.chunks)
    ? raw.chunks.map(asChunk).filter((c): c is ChordChunk => c !== null)
    : [];
  const markers: ChordMarker[] = Array.isArray(raw.markers)
    ? raw.markers.map((m) => asMarker(m, chunks)).filter((m): m is ChordMarker => m !== null)
    : [];

  const now = new Date().toISOString();
  return {
    slug,
    title: asString(raw.title, slug),
    createdAt: asString(raw.createdAt, now),
    updatedAt: asString(raw.updatedAt, now),
    source: {
      filename,
      durationSec: asNumber(source?.durationSec),
      width: asNumber(source?.width),
      height: asNumber(source?.height),
    },
    sheetText: asString(raw.sheetText),
    chunks,
    voicings,
    markers,
    variation: asVariation(raw.variation),
    bpmDisplay: asNumber(raw.bpmDisplay),
    capoDisplay: asNumber(raw.capoDisplay),
    watermark: asString(raw.watermark, DEFAULT_WATERMARK),
    strum: asStrum(raw.strum),
    elements: asElements(raw.elements),
    tabDisplay: asTabDisplay(raw.tabDisplay),
    baked: isObject(raw.baked) && typeof raw.baked.outputFilename === "string" && typeof raw.baked.bakedAt === "string"
      ? { outputFilename: raw.baked.outputFilename, bakedAt: raw.baked.bakedAt }
      : undefined,
  };
}

// Re-export the tab parser for callers that want defensive validation when
// constructing markers in the editor.
export { asTab };
