'use client';

import { useState, type CSSProperties } from 'react';

import { I, Icon } from '../lib/icons';

type NavKey =
  | 'home'
  | 'lessons'
  | 'songs'
  | 'assign'
  | 'theory'
  | 'students'
  | 'stats'
  | 'lstats'
  | 'calendar'
  | 'fretboard'
  | 'ai';

type Item = { k: NavKey; icon: string; label: string };
type Group = { label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    label: 'Teaching',
    items: [
      { k: 'home', icon: I.home, label: 'Dashboard' },
      { k: 'lessons', icon: I.lesson, label: 'Lessons' },
      { k: 'songs', icon: I.song, label: 'Songs' },
      { k: 'assign', icon: I.assign, label: 'Assignments' },
      { k: 'theory', icon: I.theory, label: 'Theory' },
    ],
  },
  { label: 'Students', items: [{ k: 'students', icon: I.students, label: 'Students' }] },
  {
    label: 'Analytics',
    items: [
      { k: 'stats', icon: I.stats, label: 'Song Stats' },
      { k: 'lstats', icon: I.lessonStats, label: 'Lesson Stats' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { k: 'calendar', icon: I.calendar, label: 'Calendar' },
      { k: 'fretboard', icon: I.fretboard, label: 'Fretboard' },
      { k: 'ai', icon: I.ai, label: 'AI Assistant' },
    ],
  },
];

type SidebarNavProps = {
  active?: NavKey;
  roleLabel?: string;
  userInitials?: string;
  userName?: string;
  userRole?: string;
};

const searchWrap: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  background: 'var(--rule-2)',
  border: '1px solid transparent',
  borderRadius: 8,
  color: 'var(--ink-3)',
  fontSize: 12.5,
  transition: 'border-color .15s, background .15s',
};

export const SidebarNav = ({
  active = 'home',
  roleLabel = 'Teacher',
  userInitials = 'SC',
  userName = 'Sarah Chen',
  userRole = 'Teacher · Pro',
}: SidebarNavProps) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  return (
    <aside
      style={{
        width: 232,
        flex: '0 0 232px',
        background: 'var(--paper)',
        borderRight: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 12px',
        gap: 4,
        fontSize: 13,
      }}
    >
      {/* brand */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 8px 12px 8px',
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--gold) 0%, var(--gold-2) 100%)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.15)',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          >
            <path d="M5 19c0-3 2-5 4-6s2-4 5-4 5 3 5 3-2 2-5 2-3 2-5 3-4 2-4 2z" />
          </svg>
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div
            style={{
              fontFamily: 'var(--serif)',
              fontWeight: 600,
              fontSize: 17,
              letterSpacing: '-0.01em',
            }}
          >
            Strummy
          </div>
          <div
            style={{
              color: 'var(--ink-4)',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {roleLabel}
          </div>
        </div>
      </div>

      {/* search */}
      <div style={{ padding: '0 2px 8px' }}>
        <div
          style={{
            ...searchWrap,
            borderColor: focused ? 'var(--gold-dim)' : 'transparent',
            background: focused ? 'var(--card)' : 'var(--rule-2)',
          }}
        >
          <Icon d={I.search} size={13} style={{ color: 'var(--ink-4)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search students, songs, lessons…"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 12.5,
              color: 'var(--ink)',
              fontFamily: 'var(--sans)',
              minWidth: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--ink-4)',
              padding: '1px 5px',
              border: '1px solid var(--rule)',
              borderRadius: 4,
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {GROUPS.map((g) => (
          <div key={g.label} style={{ marginTop: 6 }}>
            <div
              style={{
                padding: '8px 10px 4px 10px',
                color: 'var(--ink-4)',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '.14em',
                fontWeight: 500,
              }}
            >
              {g.label}
            </div>
            {g.items.map((it) => {
              const isActive = it.k === active;
              return (
                <div
                  key={it.k}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '7px 10px',
                    borderRadius: 8,
                    color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                    background: isActive ? 'var(--rule-2)' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: -12,
                        top: 8,
                        bottom: 8,
                        width: 3,
                        background: 'var(--gold)',
                        borderRadius: '0 3px 3px 0',
                      }}
                    />
                  )}
                  <Icon d={it.icon} size={15} />
                  <span>{it.label}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--rule)',
          paddingTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'var(--ink-2)',
            color: 'var(--paper)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {userInitials}
        </div>
        <div style={{ flex: 1, lineHeight: 1.15 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{userName}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{userRole}</div>
        </div>
        <Icon d={I.logout} size={14} style={{ color: 'var(--ink-4)' }} />
      </div>
    </aside>
  );
};
