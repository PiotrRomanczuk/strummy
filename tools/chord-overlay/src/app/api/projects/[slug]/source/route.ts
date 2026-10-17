import fs from "node:fs";
import fsp from "node:fs/promises";
import { NextResponse } from "next/server";
import { readProject, sourcePath } from "@/lib/projectStore";
import { isValidSlug } from "@/lib/slug";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new NextResponse("Bad slug", { status: 400 });

  const project = await readProject(slug);
  const file = sourcePath(slug, project.source.filename);
  const ext = file.slice(file.lastIndexOf("."));
  const contentType = MIME[ext] ?? "application/octet-stream";

  const stat = await fsp.stat(file);
  const size = stat.size;
  const range = req.headers.get("range");

  if (range) {
    // Parse "bytes=START-END"; END is optional.
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      return new NextResponse("Invalid Range", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const start = match[1] === "" ? 0 : Number(match[1]);
    const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
      return new NextResponse("Invalid Range", {
        status: 416,
        headers: { "Content-Range": `bytes */${size}` },
      });
    }
    const stream = fs.createReadStream(file, { start, end });
    return new NextResponse(stream as unknown as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  }

  const stream = fs.createReadStream(file);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}
