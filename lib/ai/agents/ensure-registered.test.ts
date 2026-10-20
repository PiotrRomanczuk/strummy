import { hasAgent, unregisterAgent } from '../registry';

import { ensureAgentRegistered } from './ensure-registered';

describe('ensureAgentRegistered', () => {
  it('registers the agents when the registry does not know the requested one', () => {
    unregisterAgent('lesson-transcript-draft');
    expect(hasAgent('lesson-transcript-draft')).toBe(false);

    ensureAgentRegistered('lesson-transcript-draft');

    expect(hasAgent('lesson-transcript-draft')).toBe(true);
    expect(hasAgent('song-chord-extraction')).toBe(true);
    expect(hasAgent('song-normalization')).toBe(true);
  });

  it('is a no-op once the agent is present', () => {
    ensureAgentRegistered('lesson-transcript-draft');
    expect(() => ensureAgentRegistered('lesson-transcript-draft')).not.toThrow();
    expect(hasAgent('lesson-transcript-draft')).toBe(true);
  });
});
