import { I, Icon } from '../lib/icons';
import { Eyebrow } from '../primitives/atoms';
import { StringVibration } from '../primitives/StringVibration';

export const AssistantStrip = () => (
  <div
    style={{
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, var(--ink) 0%, var(--ink-2) 100%)',
      color: 'var(--paper)',
      borderRadius: 14,
      padding: '20px 22px',
      boxShadow: '0 10px 30px -16px rgba(0,0,0,.4)',
    }}
  >
    <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
      <StringVibration width={500} height={200} color="var(--gold-dim)" opacity={0.4} />
    </div>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, var(--gold-2), var(--gold))',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon d={I.spark} size={18} stroke="#fff" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Eyebrow style={{ color: 'var(--gold-dim)' }}>Strummy AI</Eyebrow>
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 15,
            fontStyle: 'italic',
            marginTop: 2,
            lineHeight: 1.35,
          }}
        >
          “Carlos is the highest-risk of your watchlist. Want me to draft a 3-step re-engagement
          plan?”
        </div>
      </div>
      <button
        style={{
          padding: '8px 14px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--gold-2)',
          color: '#fff',
          fontWeight: 500,
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: 'var(--sans)',
        }}
      >
        Draft plan
      </button>
    </div>
  </div>
);
