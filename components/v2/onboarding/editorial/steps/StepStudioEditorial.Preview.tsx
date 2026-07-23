'use client';

import type { TeacherStudioData } from '@/types/onboarding-editorial';
import { studioInitials } from '../onboarding-editorial.helpers';

const metaLabel: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
};

/** Live-updating studio card shown in the right rail of the "Your studio" step. */
export const StudioPreview = ({ teacher }: { teacher: TeacherStudioData }) => {
  const nameForInitials = teacher.studioName || teacher.displayName;
  const teaches = teacher.teaches.slice(0, 4);

  return (
    <div>
      <div style={{ ...metaLabel, marginBottom: 10 }}>Live preview</div>
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--rule)',
          borderRadius: 12,
          padding: '20px 22px',
          boxShadow: '0 12px 24px -16px rgba(0,0,0,.15)',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--gold), var(--gold-2))',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontFamily: 'var(--serif)',
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 14,
          }}
        >
          {studioInitials(nameForInitials)}
        </div>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {teacher.studioName || 'Your studio name'}
        </div>
        {teacher.tagline && (
          <div
            style={{
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--ink-3)',
              marginTop: 4,
              fontFamily: 'var(--serif)',
            }}
          >
            &ldquo;{teacher.tagline}&rdquo;
          </div>
        )}
        {teaches.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
            {teaches.map((tag) => (
              <span
                key={tag}
                style={{
                  ...metaLabel,
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: 'var(--paper)',
                  border: '1px solid var(--rule)',
                  color: 'var(--ink-3)',
                  letterSpacing: '.1em',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid var(--rule)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
          }}
        >
          <div>
            <div style={metaLabel}>Lesson</div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: 14 }}>
              {teacher.defaultLessonMinutes} min
            </div>
          </div>
          <div>
            <div style={metaLabel}>City</div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{teacher.city || '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
