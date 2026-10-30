import fs from "node:fs";
import { NextResponse } from "next/server";
import { outputPath } from "@/lib/projectStore";
import { isValidSlug } from "@/lib/slug";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new NextResponse("Bad slug", { status: 400 });
  const file = outputPath(slug);
  if (!fs.existsSync(file)) {
    return new NextResponse("Not baked yet", { status: 404 });
  }
  const stream = fs.createReadStream(file);
  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${slug}.mp4"`,
      "Cache-Control": "no-store",
    },
  });
}
