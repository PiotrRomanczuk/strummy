import Link from 'next/link';

import type { AssignmentTemplateRow } from '@/lib/services/assignment-template-queries';

type Props = { templates: AssignmentTemplateRow[] };

// eslint-disable-next-line max-lines-per-function -- editorial list (inline styles)
export const TemplatesListEditorial = ({ templates }: Props) => (
  <div
    style={{
      background: 'var(--ivory)',
      color: 'var(--ink)',
      fontSize: 13,
      lineHeight: 1.4,
      minHeight: '100%',
      padding: '28px 32px 64px',
    }}
  >
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Link
        href="/dashboard/assignments"
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--ink-4)',
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '.14em',
        }}
      >
        ← Assignments
      </Link>

      <div
        style={{
          margin: '14px 0 20px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}
        >
          Templates
        </h1>
        <Link
          href="/dashboard/assignments/templates/new"
          style={{
            border: '1px solid var(--rule)',
            borderRadius: 8,
            padding: '8px 16px',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.1em',
            color: 'var(--ink-2)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          + New template
        </Link>
      </div>

      {templates.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: 'var(--ink-4)',
            fontStyle: 'italic',
            fontFamily: 'var(--serif)',
            fontSize: 15,
            border: '1px solid var(--rule)',
            borderRadius: 10,
            background: 'var(--card)',
          }}
        >
          No templates yet. Save repeated homework as a template to reuse it in one click.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/assignments/templates/${t.id}`}
              style={{
                display: 'block',
                background: 'var(--card)',
                border: '1px solid var(--rule)',
                borderRadius: 10,
                padding: '16px 20px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 16 }}>
                {t.title}
              </div>
              {t.description && (
                <div
                  style={{
                    marginTop: 4,
                    color: 'var(--ink-3)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.description}
                </div>
              )}
              {t.checklist.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '.1em',
                    color: 'var(--ink-4)',
                  }}
                >
                  {t.checklist.length} checklist item{t.checklist.length === 1 ? '' : 's'}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  </div>
);
