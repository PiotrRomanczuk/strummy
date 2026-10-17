import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { bakeStatusPath } from "@/lib/projectStore";
import { isValidSlug } from "@/lib/slug";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new NextResponse("Bad slug", { status: 400 });
  try {
    const raw = await fs.readFile(bakeStatusPath(slug), "utf8");
    return new NextResponse(raw, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({
      phase: "idle", framesDone: 0, framesTotal: 0,
      updatedAt: new Date().toISOString(),
    });
  }
}
