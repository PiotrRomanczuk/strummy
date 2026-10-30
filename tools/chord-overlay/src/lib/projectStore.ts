import fs from "node:fs/promises";
import path from "node:path";
import type { Project } from "./types";
import { parseProjectJson } from "./projectSchema";
import { assertValidSlug } from "./slug";

// All project state lives under ./projects/<slug>/. Single-machine, single-user;
// the filesystem is the database. Each project owns its source upload, the
// project.json (markers, voicings, sheet text), and after baking, the rendered
// outputs.
const PROJECTS_ROOT = path.join(process.cwd(), "projects");

export function projectDir(slug: string): string {
  return path.join(PROJECTS_ROOT, assertValidSlug(slug));
}

export function sourcePath(slug: string, filename: string): string {
  return path.join(projectDir(slug), "source" + path.extname(filename));
}

export function outputPath(slug: string): string {
  return path.join(projectDir(slug), "output.mp4");
}

export function overlayPath(slug: string): string {
  return path.join(projectDir(slug), "overlay.webm");
}

export function bakeStatusPath(slug: string): string {
  return path.join(projectDir(slug), "bake-status.json");
}

export async function ensureProjectsRoot(): Promise<void> {
  await fs.mkdir(PROJECTS_ROOT, { recursive: true });
}

export async function readProject(slug: string): Promise<Project> {
  const file = path.join(projectDir(slug), "project.json");
  const raw = await fs.readFile(file, "utf8");
  return parseProjectJson(JSON.parse(raw));
}

export async function writeProject(project: Project): Promise<void> {
  const dir = projectDir(project.slug);
  await fs.mkdir(dir, { recursive: true });
  project.updatedAt = new Date().toISOString();
  await fs.writeFile(
    path.join(dir, "project.json"),
    JSON.stringify(project, null, 2),
    "utf8",
  );
}

export async function listProjects(): Promise<Project[]> {
  await ensureProjectsRoot();
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true });
  const projects: Project[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      projects.push(await readProject(entry.name));
    } catch {
      // Stray directory or corrupt project.json — skip rather than crash the list.
    }
  }
  return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteProject(slug: string): Promise<void> {
  await fs.rm(projectDir(slug), { recursive: true, force: true });
}

export async function projectExists(slug: string): Promise<boolean> {
  try {
    await fs.access(path.join(projectDir(slug), "project.json"));
    return true;
  } catch {
    return false;
  }
}
