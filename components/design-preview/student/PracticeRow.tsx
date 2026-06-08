'use client';

import { useState } from 'react';

import { I, Icon } from '../lib/icons';
import type { PracticeItem } from '../lib/types';

export const PracticeRow = ({ item }: { item: PracticeItem }) => {
  const [done, setDone] = useState(item.done);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 38px 1fr auto auto',
        gap: 14,
        alignItems: 'center',
        padding: '12px 0',
        borderTop: '1px solid var(--rule)',
      }}
    >
      <button
        onClick={() => setDone((d) => !d)}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '1.5px solid ' + (done ? 'var(--gold-2)' : 'var(--ink-5)'),
          background: done ? 'var(--gold-2)' : 'transparent',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          padding: 0,
        }}
      >
        {done && <Icon d={I.check} size={11} stroke="#fff" strokeWidth={2.2} />}
      </button>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
          textAlign: 'right',
        }}
      >
        <span style={{ display: 'block', fontSize: 9, letterSpacing: '.1em' }}>KEY</span>
        <span
          style={{
            display: 'block',
            color: item.key === '—' ? 'var(--ink-5)' : 'var(--gold-2)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {item.key}
        </span>
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 17,
            fontStyle: item.kind === 'song' ? 'italic' : 'normal',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            textDecoration: done ? 'line-through' : 'none',
            color: done ? 'var(--ink-4)' : 'var(--ink)',
          }}
        >
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{item.sub}</div>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-3)' }}>
        {item.mins}m
      </div>
      <button
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--rule-2)',
          border: 'none',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-2)',
        }}
      >
        <Icon d={I.play} size={11} stroke="none" fill="currentColor" />
      </button>
    </div>
  );
};
