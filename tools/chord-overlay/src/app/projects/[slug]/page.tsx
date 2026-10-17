import { notFound } from "next/navigation";
import { projectExists, readProject } from "@/lib/projectStore";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await projectExists(slug))) notFound();
  const project = await readProject(slug);
  return <Editor initial={project} />;
}
