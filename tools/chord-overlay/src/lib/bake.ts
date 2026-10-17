import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import puppeteer from "puppeteer";
import {
  bakeStatusPath,
  outputPath,
  projectDir,
  readProject,
  sourcePath,
} from "./projectStore";
import type { BakeStatus } from "./bakeStatus";

const FPS = 30;
const W = 1920;
const H = 1080;

async function writeStatus(slug: string, patch: Partial<BakeStatus>): Promise<void> {
  const path = bakeStatusPath(slug);
  let current: BakeStatus = {
    phase: "idle", framesDone: 0, framesTotal: 0, updatedAt: new Date().toISOString(),
  };
  try {
    current = JSON.parse(await fs.readFile(path, "utf8")) as BakeStatus;
  } catch { /* fresh status */ }
  const next: BakeStatus = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await fs.writeFile(path, JSON.stringify(next), "utf8");
}

// Probe input duration with ffprobe so we know how many frames to render.
async function probeDuration(file: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      file,
    ]);
    let out = "";
    let err = "";
    proc.stdout.on("data", (d) => { out += d; });
    proc.stderr.on("data", (d) => { err += d; });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffprobe failed: ${err}`));
      const dur = parseFloat(out.trim());
      if (!Number.isFinite(dur)) return reject(new Error(`ffprobe parsed NaN: ${out}`));
      resolve(dur);
    });
  });
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    proc.stderr.on("data", (d) => { err += d; });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed (${code}): ${err.slice(-2000)}`));
      resolve();
    });
  });
}

interface BakeOptions {
  slug: string;
  baseUrl: string;
}

export async function bakeProject({ slug, baseUrl }: BakeOptions): Promise<void> {
  const project = await readProject(slug);
  const sourceFile = sourcePath(slug, project.source.filename);
  const dir = projectDir(slug);

  const duration = await probeDuration(sourceFile);
  const totalFrames = Math.floor(duration * FPS);

  await writeStatus(slug, { phase: "rendering", framesDone: 0, framesTotal: totalFrames });

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--window-size=${W},${H}`,
      "--no-sandbox",
      // Force transparent background so the rendered PNGs have alpha channels.
      "--default-background-color=00000000",
    ],
  });

  // Step 1: encode PNG sequence into a transparent VP9 WebM. We pipe each
  // screenshot directly into ffmpeg's stdin via image2pipe, avoiding a
  // round-trip through the filesystem for thousands of frames.
  const overlayFile = `${dir}/overlay.webm`;
  const ffmpegOverlay = spawn("ffmpeg", [
    "-y",
    "-f", "image2pipe",
    "-framerate", String(FPS),
    "-i", "pipe:0",
    "-c:v", "libvpx-vp9",
    "-pix_fmt", "yuva420p",
    "-b:v", "8M",
    overlayFile,
  ], { stdio: ["pipe", "ignore", "pipe"] });
  let ffmpegOverlayErr = "";
  ffmpegOverlay.stderr.on("data", (d) => { ffmpegOverlayErr += d; });
  const ffmpegOverlayDone = new Promise<void>((resolve, reject) => {
    ffmpegOverlay.on("error", reject);
    ffmpegOverlay.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg overlay failed (${code}): ${ffmpegOverlayErr.slice(-2000)}`));
      resolve();
    });
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
    // Use `domcontentloaded` rather than `networkidle0` — we have an explicit
    // readiness signal (__OVERLAY_READY) so we don't need a heuristic wait
    // that breaks if the page ever opens any long-lived connection.
    await page.goto(`${baseUrl}/render/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__OVERLAY_READY === true, { timeout: 15000 });
    // Make sure web fonts are loaded before the first frame to avoid FOUT
    // showing up in the early frames of the overlay.
    await page.evaluate(() => document.fonts?.ready ?? null);

    for (let i = 0; i < totalFrames; i++) {
      const t = i / FPS;
      await page.evaluate((time) => window.__setOverlayTime?.(time), t);
      // Double rAF guarantees React has committed and the browser has painted
      // the new frame before we screenshot. A single rAF can fire mid-commit
      // under React 19's scheduler.
      await page.evaluate(
        () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
      );
      const buf = await page.screenshot({ omitBackground: true, type: "png" });
      const ok = ffmpegOverlay.stdin.write(buf);
      if (!ok) await new Promise<void>((r) => ffmpegOverlay.stdin.once("drain", r));
      if (i % 10 === 0 || i === totalFrames - 1) {
        await writeStatus(slug, { framesDone: i + 1 });
      }
    }
    ffmpegOverlay.stdin.end();
  } finally {
    await browser.close();
  }

  await writeStatus(slug, { phase: "encoding-overlay" });
  await ffmpegOverlayDone;

  // Step 2: composite overlay onto source, normalize to TikTok spec.
  await writeStatus(slug, { phase: "compositing" });
  await runFfmpeg([
    "-y",
    "-i", sourceFile,
    "-i", overlayFile,
    "-filter_complex",
    `[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=${FPS}[bg];[bg][1:v]overlay=format=auto[v]`,
    "-map", "[v]",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outputPath(slug),
  ]);

  await writeStatus(slug, { phase: "done", framesDone: totalFrames });
}
