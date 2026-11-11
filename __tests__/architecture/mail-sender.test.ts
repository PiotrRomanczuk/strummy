/**
 * @jest-environment node
 */
/**
 * Production mail goes through Resend, which refuses any sender outside the
 * verified strummy.online domain: `550 The gmail.com domain is not verified`.
 * Building `from` off GMAIL_USER therefore fails at send time, and for admin
 * alerts that failure was invisible — the alert about the failure was the mail
 * that could not be sent. Every sender uses MAIL_FROM from smtp-client.
 */
import { spawnSync } from 'node:child_process';

describe('mail sender', () => {
  it('no production code builds a mail header off GMAIL_USER', () => {
    const { stdout } = spawnSync(
      'git',
      ['grep', '-n', '-E', '(from|to): .*GMAIL_USER', '--', 'lib', 'app', ':!*.test.ts'],
      { encoding: 'utf8' }
    );

    expect(stdout).toBe('');
  });
});
