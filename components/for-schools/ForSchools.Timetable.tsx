import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';

import { TIMETABLE, TIMETABLE_ROOMS, type TimetableCell } from './for-schools.data';

const label = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  letterSpacing: '.06em',
  color: 'var(--ink-4)',
} as const;

const Block = ({
  title,
  detail,
  variant,
}: {
  title: string;
  detail: string;
  variant?: 'absent' | 'cover';
}) => (
  <div className={`ui-sch-blk${variant ? ` ui-sch-blk--${variant}` : ''}`}>
    <b
      style={{
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        lineHeight: 1.25,
        color: variant === 'absent' ? 'var(--ink-4)' : 'var(--ink)',
        textDecoration: variant === 'absent' ? 'line-through' : 'none',
      }}
    >
      {title}
    </b>
    <span
      style={{
        display: 'block',
        fontSize: 12,
        marginTop: 3,
        color: variant === 'cover' ? 'var(--gold-2)' : 'var(--ink-3)',
      }}
    >
      {detail}
    </span>
  </div>
);

const Grid = async () => {
  const t = await getTranslations('ForSchools.timetable');
  const subject = await getTranslations('ForSchools.timetable.subjects');

  const cellContent = (cell: TimetableCell) =>
    cell.kind === 'lesson' ? (
      <Block title={subject(cell.subject)} detail={`${cell.student} · ${cell.teacher}`} />
    ) : (
      <div className="ui-sch-swap" style={{ height: '100%' }}>
        <Block
          title={subject(cell.subject)}
          detail={t('absence', { teacher: cell.absent })}
          variant="absent"
        />
        <Block
          title={subject(cell.subject)}
          detail={t('cover', { teacher: cell.cover })}
          variant="cover"
        />
      </div>
    );

  return (
    <div className="ui-sch-grid">
      <div style={{ borderBottom: '1px solid var(--rule)' }} />
      {TIMETABLE_ROOMS.map((room) => (
        <div
          key={room}
          style={{ ...label, padding: '9px 8px', borderBottom: '1px solid var(--rule)' }}
        >
          {t('room', { number: room })}
        </div>
      ))}

      {TIMETABLE.map((slot) => (
        <Fragment key={slot.time}>
          <div style={{ ...label, padding: '12px 6px', borderRight: '1px solid var(--rule)' }}>
            {slot.time}
          </div>
          {slot.cells.map((cell, room) => (
            <div key={`${slot.time}-${room}`} className="ui-sch-cell">
              {cellContent(cell)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
};

/**
 * One school Thursday, three rooms. The 17:00 piano slot swaps from "off sick"
 * to "cover" on its own — the whole page argues that this is two clicks, so
 * the timetable shows the move instead of describing it.
 */
export const SchoolsTimetable = async () => {
  const t = await getTranslations('ForSchools.timetable');

  return (
    <figure
      aria-label={t('label')}
      style={{
        margin: 0,
        background: 'var(--card)',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          padding: '14px 16px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <strong style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 500 }}>
          {t('day')}
        </strong>
        <span style={label}>{t('summary')}</span>
      </div>

      <div className="ui-sch-scroll">
        <Grid />
      </div>

      <figcaption
        style={{
          padding: '12px 16px',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--ink-3)',
          borderTop: '1px solid var(--rule)',
        }}
      >
        {/* Names here match the sample rows in `for-schools.data.ts`. Keeping the
            sentence whole rather than interpolating them keeps Polish grammar
            (genitive: "Rodzic Anny") the translator's business, not the code's. */}
        {t('footnote')}
      </figcaption>
    </figure>
  );
};
