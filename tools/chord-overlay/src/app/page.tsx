import Link from "next/link";
import { listProjects } from "@/lib/projectStore";
import { createProject, deleteProject } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-10">
        <div className="flex items-baseline gap-3">
          <span className="inline-block h-3 w-3 rounded-full bg-orange-500 shadow-[0_0_12px_rgba(251,146,60,0.55)]" />
          <h1 className="text-3xl font-bold tracking-tight">JMG Overlay</h1>
        </div>
        <p className="mt-2 max-w-xl text-sm text-stone-600">
          Bake chord overlays into your guitar videos. Upload a take, paste a chord sheet,
          mark the changes, tweak the look, bake to a TikTok-ready mp4.
        </p>
      </header>

      <section className="mb-12 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">New project</h2>
        <form action={createProject} className="flex items-center gap-3">
          <input
            type="file"
            name="video"
            accept="video/*"
            required
            className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-md file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
          >Upload</button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
          Projects {projects.length > 0 && <span className="text-stone-400">· {projects.length}</span>}
        </h2>
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center">
            <p className="text-sm text-stone-500">No projects yet. Upload a video above to get started.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li
                key={p.slug}
                className="group rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:border-stone-300 hover:shadow-md"
              >
                <Link href={`/projects/${p.slug}`} className="block">
                  <div className="font-semibold text-stone-900 transition group-hover:text-orange-600">{p.title}</div>
                  <div className="mt-1 font-mono text-xs text-stone-500">
                    {new Date(p.updatedAt).toLocaleString()}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-700">
                      {p.markers.length} markers
                    </span>
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-stone-700">
                      {p.variation}
                    </span>
                    {p.baked && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">baked</span>
                    )}
                  </div>
                </Link>
                <form
                  action={async () => { "use server"; await deleteProject(p.slug); }}
                  className="mt-3"
                >
                  <button type="submit" className="text-xs text-stone-400 transition hover:text-red-500">
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
