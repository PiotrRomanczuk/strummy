/** Claude Design `DateBlock` (large): month strip, serif day, weekday. */
export const LessonDateBlock = ({ iso, size = 'lg' }: { iso: string; size?: 'md' | 'lg' }) => {
  const isMd = size === 'md';
  const d = new Date(iso);
  const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const wday = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  return (
    <div
      aria-hidden="true"
      style={{
        width: isMd ? 56 : 72,
        flex: `0 0 ${isMd ? 56 : 72}px`,
        textAlign: 'center',
        border: '1px solid var(--rule)',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--card)',
      }}
    >
      <div
        style={{
          background: 'var(--rule-2)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: 'var(--gold-2)',
          padding: '4px 0',
          fontWeight: 500,
        }}
      >
        {mon}
      </div>
      <div
        style={{
          fontFamily: 'var(--serif)',
          fontSize: isMd ? 22 : 30,
          fontWeight: 500,
          lineHeight: 1,
          padding: '6px 0 2px',
        }}
      >
        {d.getDate()}
      </div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          paddingBottom: 6,
        }}
      >
        {wday}
      </div>
    </div>
  );
};
