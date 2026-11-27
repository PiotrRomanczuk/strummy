import type { CSSProperties, ReactNode } from 'react';

export const Card = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 10,
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

export const CardHeader = ({
  eyebrow,
  title,
  action,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  action?: ReactNode;
}) => (
  <div
    style={{
      padding: '20px 24px 12px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    }}
  >
    <div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          fontWeight: 500,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          marginTop: 2,
        }}
      >
        {title}
      </div>
    </div>
    {action}
  </div>
);

export type StageKey = 'to_learn' | 'started' | 'remembered' | 'with_author' | 'mastered';

// Labels live in messages/*.json under Songs.stage* — this only carries the
// stable key order; render sites resolve text via `stageLabelKey` + `t()`.
export const STAGES: { key: StageKey }[] = [
  { key: 'to_learn' },
  { key: 'started' },
  { key: 'remembered' },
  { key: 'with_author' },
  { key: 'mastered' },
];

export const STAGE_LABEL_KEYS: Record<StageKey, string> = {
  to_learn: 'stageToLearn',
  started: 'stageStarted',
  remembered: 'stageRemembered',
  with_author: 'stagePlayAlong',
  mastered: 'stageMastered',
};

export const stageLabelKey = (key: StageKey): string => STAGE_LABEL_KEYS[key];

export const STAGE_COLOR: Record<StageKey, string> = {
  to_learn: 'var(--ink-4)',
  started: 'var(--info)',
  remembered: 'var(--warn)',
  with_author: '#7a6aa0',
  mastered: 'var(--success)',
};

type StageStepperProps = {
  status: StageKey;
  size?: 'sm' | 'md';
  t: (key: string) => string;
};

export const StageStepper = ({ status, size = 'md', t }: StageStepperProps) => {
  const idx = STAGES.findIndex((stg) => stg.key === status);
  const color = STAGE_COLOR[status];
  const h = size === 'sm' ? 6 : 8;
  const wrap: CSSProperties = {
    display: 'flex',
    gap: 3,
    alignItems: 'center',
    width: '100%',
  };

  return (
    <div style={wrap}>
      {STAGES.map((st, i) => (
        <div
          key={st.key}
          title={t(stageLabelKey(st.key))}
          style={{
            flex: 1,
            height: h,
            borderRadius: 2,
            background: i <= idx ? color : 'var(--rule)',
          }}
        />
      ))}
    </div>
  );
};
