import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

type Props = { songId: string };

export const SongHeroEditLink = async ({ songId }: Props) => {
  const t = await getTranslations('Songs');
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
      <Link
        href={`/dashboard/songs/${songId}/edit`}
        className="ui-chip"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-3)',
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          padding: '6px 12px',
          border: '1px solid var(--rule)',
          borderRadius: 99,
        }}
      >
        {t('editSongLink')}
      </Link>
    </div>
  );
};
