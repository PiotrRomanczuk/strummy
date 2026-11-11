/**
 * @jest-environment node
 */
import { register, STUDIO_TIME_ZONE } from '../../instrumentation';

describe('studio time zone', () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('puts the server on the studio clock before the first request', async () => {
    process.env.TZ = 'UTC';

    await register();

    expect(process.env.TZ).toBe(STUDIO_TIME_ZONE);
  });
});
