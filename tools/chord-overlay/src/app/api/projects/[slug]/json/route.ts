import { NextResponse } from "next/server";
import { readProject } from "@/lib/projectStore";
import { isValidSlug } from "@/lib/slug";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return new NextResponse("Bad slug", { status: 400 });
  const project = await readProject(slug);
  return NextResponse.json(project);
}
