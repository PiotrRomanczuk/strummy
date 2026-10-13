import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Auth');
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
        {t('checkInbox')}
      </h1>
      <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ink-3)' }}>{t('sentTo')}</p>
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
          {t('whatNext')}
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
            {t.rich('step1', {
              b: (chunks) => <strong style={{ fontWeight: 500 }}>{chunks}</strong>,
            })}
          </li>
          <li>
            {t.rich('step2', {
              em: (chunks) => <em style={{ color: 'var(--gold-2)' }}>{chunks}</em>,
            })}
          </li>
          <li>{t('step3')}</li>
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
          {t('useDifferentEmail')}
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
          {isResending ? t('sendingShort') : t('resendLink')}
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
        {t.rich('notSeeing', {
          b: (chunks) => (
            <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{chunks}</strong>
          ),
        })}
      </div>
    </div>
  );
}
