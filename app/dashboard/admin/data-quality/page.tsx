import { redirect } from 'next/navigation';

export const metadata = { title: 'Data quality' };

type PageProps = { searchParams: Promise<{ rule?: string }> };

/**
 * The song data-quality report moved into the repertoire statistics (2026-11-16), where it sits beside the
 * comparison with the recordings. Old links and bookmarks land on the same report there, filter included.
 */
export default async function DataQualityPage({ searchParams }: PageProps) {
  const { rule } = await searchParams;
  const query = new URLSearchParams({ view: 'quality' });
  if (rule) query.set('rule', rule);
  redirect(`/dashboard/admin/repertoire-stats?${query.toString()}`);
}
