import { getTranslations } from 'next-intl/server';

import type { HarmonyAnalysis, HarmonyDegree } from '@/lib/music-theory/harmony-analysis';

import { Card, CardHeader } from './SongPrimitives';

type Props = { analysis: HarmonyAnalysis | null };

const DegreeChip = ({ degree }: { degree: HarmonyDegree }) => (
  <li
    className={`flex min-w-14 flex-col items-center rounded-md border px-2.5 py-1.5 ${
      degree.isDiatonic ? 'border-[var(--rule)]' : 'border-[var(--gold)] bg-[var(--gold-tint)]'
    }`}
  >
    <span className="font-[family-name:var(--serif)] text-base text-[var(--ink)]">
      {degree.numeral}
    </span>
    <span className="text-xs text-[var(--ink-3)]">{degree.chord}</span>
  </li>
);

export const SongHarmonyCard = async ({ analysis }: Props) => {
  if (!analysis) return null;

  const t = await getTranslations('Songs');
  const outside = analysis.degrees.filter((degree) => degree.outsideKind);

  return (
    <Card>
      <CardHeader eyebrow={t('harmonyEyebrow')} title={t('harmonyTitle')} />
      <div className="flex flex-col gap-4 px-6 pb-6">
        <p className="text-sm text-[var(--ink-2)]">
          {t(analysis.isKeyGuess ? 'harmonyKeyGuess' : 'harmonyKey', { key: analysis.key })}
          {analysis.soundingKey && ` ${t('harmonySounding', { key: analysis.soundingKey })}`}
        </p>

        <ul className="flex flex-wrap gap-2">
          {analysis.degrees.map((degree) => (
            <DegreeChip key={degree.chord} degree={degree} />
          ))}
        </ul>

        {outside.length > 0 && (
          <div className="flex flex-col gap-1">
            <h4 className="text-xs font-medium text-[var(--ink-3)]">{t('harmonyOutsideTitle')}</h4>
            <ul className="flex flex-col gap-1 text-sm text-[var(--ink-2)]">
              {outside.map((degree) => (
                <li key={degree.chord}>
                  <strong className="font-medium text-[var(--ink)]">{degree.chord}</strong>{' '}
                  {t(`harmonyOutside.${degree.outsideKind}`, { target: degree.target ?? '' })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.archetypes.length > 0 && (
          <p className="text-sm text-[var(--ink-2)]">
            {t('harmonyProgression', {
              names: analysis.archetypes.map((a) => t(`harmonyArchetype.${a.name}`)).join(', '),
            })}
          </p>
        )}
      </div>
    </Card>
  );
};
