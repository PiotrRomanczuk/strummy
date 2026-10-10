import { Mail } from 'lucide-react';

type Props = {
  email: string;
  isResending: boolean;
  onResend: () => void;
  onChangeEmail: () => void;
  /** Error from the last resend, shown under the actions. */
  error?: string | null;
};

/** Claude Design "Check your inbox" state, used once the reset link has gone out. */
export function ForgotPasswordSent({ email, isResending, onResend, onChangeEmail, error }: Props) {
  return (
    <div role="status">
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--gold-tint)',
          border: '1px solid var(--gold-dim)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 18,
        }}
      >
        <Mail size={28} strokeWidth={1.4} color="var(--gold-2)" />
      </div>
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'var(--serif)',
          fontWeight: 400,
          fontSize: 30,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        Check your inbox.
      </h1>
      <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ink-3)' }}>
        We sent a password reset link to
      </p>
      <p
        style={{
          margin: '0 0 24px',
          fontFamily: 'var(--mono)',
          fontSize: 14,
          fontWeight: 500,
          wordBreak: 'break-all',
        }}
      >
        {email}
      </p>

      <div
        style={{
          padding: '14px 16px',
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          borderRadius: 10,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            marginBottom: 8,
          }}
        >
          What happens next
        </div>
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            listStyle: 'decimal',
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.65,
          }}
        >
          <li>
            Open the email from <strong style={{ fontWeight: 500 }}>Strummy</strong>
          </li>
          <li>
            Click <em style={{ color: 'var(--gold-2)' }}>&ldquo;Reset password&rdquo;</em>
          </li>
          <li>Choose a new password — you&apos;ll land back here, signed in.</li>
        </ol>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 22,
        }}
      >
        <button
          type="button"
          onClick={onChangeEmail}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-4)',
            fontSize: 13,
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          ← Use a different email
        </button>
        <button
          type="button"
          onClick={onResend}
          disabled={isResending}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--gold-2)',
            fontSize: 13,
            cursor: 'pointer',
            fontWeight: 500,
            padding: 0,
          }}
        >
          {isResending ? 'Sending…' : 'Resend link'}
        </button>
      </div>
      {error && (
        <p role="alert" style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      <div
        style={{
          marginTop: 24,
          padding: '10px 12px',
          background: 'var(--gold-tint)',
          border: '1px solid var(--gold-dim)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--ink-3)',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>Not seeing it?</strong> Emails
        can take up to a minute. Check your spam folder.
      </div>
    </div>
  );
}
