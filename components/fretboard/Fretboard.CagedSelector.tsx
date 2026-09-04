import { useTranslations } from 'next-intl';

import { CAGED_ORDER } from '@/lib/music-theory';

import type { CagedSelection } from './fretboard.helpers';
import { Group } from './Fretboard.Primitives';
import { chipButton } from './fretboard.styles';

const CAGED_OPTIONS: CagedSelection[] = ['none', ...CAGED_ORDER, 'all'];

export const CagedSelector = ({
  value,
  onChange,
}: {
  value: CagedSelection;
  onChange: (value: CagedSelection) => void;
}) => {
  const t = useTranslations('Fretboard');
  return (
    <Group label={t('caged.label')}>
      <div style={{ display: 'flex', gap: 3 }}>
        {CAGED_OPTIONS.map((option) => {
          const active = value === option;
          const isShape = option.length === 1;
          return (
            <button
              key={option}
              type="button"
              className="ui-fb-chip"
              data-testid={`fb-caged-${option}`}
              data-active={active}
              aria-pressed={active}
              aria-label={
                isShape
                  ? t('caged.shapeAria', { shape: option })
                  : option === 'all'
                    ? t('caged.allAria')
                    : t('caged.offAria')
              }
              onClick={() => onChange(option)}
              style={{
                ...chipButton(active),
                flex: 1,
                padding: '9px 0',
                borderRadius: 6,
                background: active ? 'var(--gold)' : 'var(--card)',
                color: active ? '#fff' : 'var(--ink-2)',
                fontFamily: isShape ? 'var(--serif)' : 'var(--sans)',
                fontSize: isShape ? 15 : 10,
                letterSpacing: isShape ? 0 : '.08em',
                textTransform: isShape ? 'none' : 'uppercase',
              }}
            >
              {option === 'none' ? t('caged.off') : option === 'all' ? t('caged.all') : option}
            </button>
          );
        })}
      </div>
    </Group>
  );
};
