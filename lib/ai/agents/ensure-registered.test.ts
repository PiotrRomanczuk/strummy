import { hasAgent, unregisterAgent } from '../registry';

import { ensureAgentRegistered } from './ensure-registered';

describe('ensureAgentRegistered', () => {
  it('registers the agents when the registry does not know the requested one', async () => {
    unregisterAgent('lesson-transcript-draft');
    expect(hasAgent('lesson-transcript-draft')).toBe(false);

    await ensureAgentRegistered('lesson-transcript-draft');

    expect(hasAgent('lesson-transcript-draft')).toBe(true);
    expect(hasAgent('song-chord-extraction')).toBe(true);
    expect(hasAgent('song-normalization')).toBe(true);
  });

  it('is a no-op once the agent is present', async () => {
    await ensureAgentRegistered('lesson-transcript-draft');
    await expect(ensureAgentRegistered('lesson-transcript-draft')).resolves.toBeUndefined();
    expect(hasAgent('lesson-transcript-draft')).toBe(true);
  });
});
