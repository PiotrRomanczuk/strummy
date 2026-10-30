"use server";

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { customAlphabet } from "nanoid";
import {
  ensureProjectsRoot,
  projectDir,
  projectExists,
  readProject,
  sourcePath,
  writeProject,
  deleteProject as fsDeleteProject,
} from "./projectStore";
import {
  DEFAULT_ELEMENTS,
  DEFAULT_STRUM_PATTERN,
  DEFAULT_TAB_DISPLAY,
  DEFAULT_VARIATION,
  DEFAULT_WATERMARK,
  type Project,
} from "./types";
import { isValidSlug } from "./slug";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 8);

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "untitled";
}

export async function createProject(formData: FormData): Promise<void> {
  const file = formData.get("video") as File | null;
  if (!file || file.size === 0) throw new Error("No video uploaded");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Upload exceeds ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit`);
  }
  await ensureProjectsRoot();

  const slug = `${slugify(file.name)}-${slugId()}`;
  const dir = projectDir(slug);
  await fsp.mkdir(dir, { recursive: true });

  const sp = sourcePath(slug, file.name);
  // Stream the upload to disk so we don't allocate the whole video into RAM.
  // file.stream() returns a web ReadableStream; wrap it into a Node Readable
  // and pipe through to a write stream.
  const webStream = file.stream() as unknown as ReadableStream<Uint8Array>;
  const nodeStream = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]);
  let written = 0;
  nodeStream.on("data", (chunk: Buffer) => {
    written += chunk.length;
    if (written > MAX_UPLOAD_BYTES) nodeStream.destroy(new Error("Upload exceeds size limit"));
  });
  await pipeline(nodeStream, fs.createWriteStream(sp));

  const now = new Date().toISOString();
  const project: Project = {
    slug,
    title: file.name.replace(/\.[^.]+$/, ""),
    createdAt: now,
    updatedAt: now,
    source: { filename: path.basename(sp) },
    sheetText: "",
    chunks: [],
    voicings: {},
    markers: [],
    variation: DEFAULT_VARIATION,
    watermark: DEFAULT_WATERMARK,
    strum: [...DEFAULT_STRUM_PATTERN],
    elements: { ...DEFAULT_ELEMENTS },
    tabDisplay: { ...DEFAULT_TAB_DISPLAY },
  };
  await writeProject(project);
  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

export async function saveProject(slug: string, patch: Partial<Project>): Promise<void> {
  if (!isValidSlug(slug)) throw new Error(`Invalid slug: ${slug}`);
  if (!(await projectExists(slug))) throw new Error(`Unknown project: ${slug}`);
  const current = await readProject(slug);
  const merged: Project = { ...current, ...patch, slug, createdAt: current.createdAt };
  await writeProject(merged);
  revalidatePath(`/projects/${slug}`);
}

export async function deleteProject(slug: string): Promise<void> {
  if (!isValidSlug(slug)) throw new Error(`Invalid slug: ${slug}`);
  await fsDeleteProject(slug);
  revalidatePath("/");
}
