import { test, expect } from '../../fixtures';
import { cell, openFretboard, HIGH_E } from '../../helpers/fretboard';

/**
 * Fretboard Explorer — playback.
 *
 * "Play notes" walks the current overlay up one string, one note per beat,
 * pulsing each position as it sounds it. The audio itself is a WebAudio pluck
 * (see components/fretboard/fretboard-audio.helpers.ts) — a browser test can
 * see the transport and the pulse, not the sound, so that is what is asserted
 * here; the audio graph has unit coverage instead.
 */

const pulse = '[data-testid^="fb-cell-"] animate';

test.describe('Fretboard Explorer — playback', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('opens stopped, audible, at 120 bpm', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');
    await expect(play).toHaveAttribute('data-playing', 'false');
    await expect(play).toContainText('Play notes');
    await expect(play).toBeEnabled();
    await expect(page.locator('[data-testid="fb-audio-state"]')).toHaveText('Audio on');
    await expect(page.locator('[data-testid="fb-bpm-value"]')).toHaveText('120');
    await expect(page.locator('[data-testid="fb-volume-value"]')).toHaveText('70');
    await expect(page.locator(pulse)).toHaveCount(0);
  });

  test('play pulses a position on the neck, stop clears it', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');

    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await expect(play).toContainText('Stop');
    // The walk runs along the G string; its first A-pentatonic-minor tone is
    // the open string, so that is where the pulse starts.
    await expect(page.locator(pulse).first()).toBeAttached();

    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'false');
    await expect(play).toContainText('Play notes');
    await expect(page.locator(pulse)).toHaveCount(0);
  });

  test('the walkthrough ends on its own and leaves the board as it found it', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');

    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');

    // Eight steps at 120 bpm is four seconds; it stops itself at the end.
    await expect(play).toHaveAttribute('data-playing', 'false', { timeout: 20_000 });
    await expect(page.locator(pulse)).toHaveCount(0);
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');
  });

  test('tempo and volume are adjustable from the keyboard', async ({ page }) => {
    const bpm = page.locator('[data-testid="fb-bpm"]');
    await bpm.focus();
    await bpm.press('ArrowRight');
    await bpm.press('ArrowRight');
    await expect(page.locator('[data-testid="fb-bpm-value"]')).toHaveText('122');
    await bpm.press('ArrowLeft');
    await expect(page.locator('[data-testid="fb-bpm-value"]')).toHaveText('121');

    const volume = page.locator('[data-testid="fb-volume"]');
    await volume.focus();
    await volume.press('ArrowLeft');
    await expect(page.locator('[data-testid="fb-volume-value"]')).toHaveText('69');
    await volume.press('Home');
    await expect(page.locator('[data-testid="fb-volume-value"]')).toHaveText('0');
  });

  test('muting silences the tool without disabling it', async ({ page }) => {
    const mute = page.locator('[data-testid="fb-mute"]');
    await expect(mute).toContainText('Mute audio');

    await mute.click();
    await expect(page.locator('[data-testid="fb-audio-state"]')).toHaveText('Muted');
    await expect(mute).toContainText('Unmute');
    await expect(mute).toHaveAttribute('aria-pressed', 'true');

    // Muted is not stopped: the walkthrough and note identification still work.
    const play = page.locator('[data-testid="fb-play"]');
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await play.click();

    await cell(page, HIGH_E, 5).click();
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('fret 5');

    await mute.click();
    await expect(page.locator('[data-testid="fb-audio-state"]')).toHaveText('Audio on');
  });

  test('chord mode plays its chord tones; off mode has nothing to play', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');

    await page.locator('[data-testid="fb-mode-chord"]').click();
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await expect(page.locator(pulse).first()).toBeAttached();
    await play.click();

    await page.locator('[data-testid="fb-mode-off"]').click();
    await expect(play).toBeDisabled();
    await expect(page.locator(pulse)).toHaveCount(0);
  });

  test('changing the key mid-walk does not strand the transport', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');

    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await page.locator('[data-testid="fb-key-C"]').click();

    // The board follows the new key immediately, mid-walk.
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');

    // Stop stays honest whatever changed underneath it. The walk also ends by
    // itself after eight steps, so only press stop if it is still running —
    // pressing it after an auto-stop would start a second walk.
    if ((await play.getAttribute('data-playing')) === 'true') await play.click();
    await expect(play).toHaveAttribute('data-playing', 'false');
    await expect(page.locator(pulse)).toHaveCount(0);
  });
});
