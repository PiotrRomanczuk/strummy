import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { bakeProject } from "@/lib/bake";
import { bakeStatusPath, readProject, writeProject } from "@/lib/projectStore";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const maxDuration = 600;

function resolveBaseUrl(host: string, proto: string): string {
  if (process.env.BAKE_BASE_URL) return process.env.BAKE_BASE_URL;
  return `${proto}://${host}`;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ ok: false, message: "Invalid slug" }, { status: 400 });
  }
  try {
    const h = await headers();
    const host = h.get("host") ?? "127.0.0.1:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const baseUrl = resolveBaseUrl(host, proto);
    await bakeProject({ slug, baseUrl });

    const project = await readProject(slug);
    project.baked = { outputFilename: "output.mp4", bakedAt: new Date().toISOString() };
    await writeProject(project);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await fs.writeFile(
        bakeStatusPath(slug),
        JSON.stringify({
          phase: "error", framesDone: 0, framesTotal: 0, message,
          updatedAt: new Date().toISOString(),
        }),
        "utf8",
      );
    } catch { /* status write best-effort */ }
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
