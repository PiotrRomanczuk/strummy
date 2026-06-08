import { I, Icon } from '../../lib/icons';
import { STUDENT_LAST_LESSON } from '../../lib/mock-data';
import { Eyebrow } from '../../primitives/atoms';

export const LastLessonCard = () => (
  <div
    style={{
      background: 'var(--card)',
      border: '1px solid var(--rule)',
      borderRadius: 14,
      padding: '22px 24px',
      boxShadow: 'var(--shadow-sm)',
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div>
        <Eyebrow>Last lesson · recap</Eyebrow>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginTop: 2 }}>
          {STUDENT_LAST_LESSON.when}
        </div>
      </div>
      <a style={{ color: 'var(--ink-4)', fontSize: 12, cursor: 'pointer' }}>Open lesson →</a>
    </div>
    <div
      style={{
        fontSize: 14,
        color: 'var(--ink-2)',
        lineHeight: 1.55,
        paddingLeft: 14,
        borderLeft: '2px solid var(--gold-dim)',
        fontStyle: 'italic',
        fontFamily: 'var(--serif)',
      }}
    >
      “{STUDENT_LAST_LESSON.recap}”
    </div>
    <div style={{ marginTop: 16 }}>
      <Eyebrow style={{ marginBottom: 8 }}>Homework</Eyebrow>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STUDENT_LAST_LESSON.homework.map((h, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '8px 0',
              borderTop: i === 0 ? '1px solid var(--rule)' : 'none',
              borderBottom: '1px solid var(--rule)',
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: '1.5px solid ' + (h.done ? 'var(--success)' : 'var(--ink-5)'),
                background: h.done ? 'var(--success)' : 'transparent',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {h.done && <Icon d={I.check} size={10} stroke="#fff" strokeWidth={2.4} />}
            </div>
            <div
              style={{
                fontSize: 13,
                color: h.done ? 'var(--ink-4)' : 'var(--ink-2)',
                textDecoration: h.done ? 'line-through' : 'none',
              }}
            >
              {h.task}
            </div>
            {!h.done && h.progress !== undefined && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)' }}>
                {h.progress}/7d
              </div>
            )}
            {h.done && <Eyebrow style={{ color: 'var(--success)' }}>Done</Eyebrow>}
          </div>
        ))}
      </div>
    </div>
  </div>
);
