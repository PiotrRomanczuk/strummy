import { test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { adminClient } from '../helpers/seed-ids';
import { castMode, reviewPersonas, type ReviewPersona } from './review-cast';
import { capturePair, closePair, openPair, REVIEW_OUT, signInPair } from './review-pair';

/**
 * The review gallery: the main screens of each role, `main`'s build beside
 * `test`'s, for a human to look at before `test` goes to production.
 *
 * Not a test of correctness — the flows and the @copy spec do that. It asserts
 * nothing; a step that breaks is recorded and shown, not failed. Run it through
 * scripts/review/run-review.sh, which builds and starts both sides
 * (REVIEW_MAIN_URL, REVIEW_TEST_URL) and turns manifest.jsonl into the gallery.
 */

const ROLES = ['publiczne', 'nauczyciel', 'uczen', 'rodzic'];
let personas: ReviewPersona[] = [];

test.beforeAll(async () => {
  personas = await reviewPersonas(adminClient());
  const cast = personas.map((p) => ({
    key: p.key,
    label: p.label,
    email: p.credentials?.email ?? null,
    steps: p.steps,
  }));
  fs.mkdirSync(REVIEW_OUT, { recursive: true });
  fs.writeFileSync(
    path.join(REVIEW_OUT, 'cast.json'),
    JSON.stringify({ mode: castMode(), cast }, null, 2)
  );
});

for (const role of ROLES) {
  test(role, async ({ browser }) => {
    const persona = personas.find((p) => p.key === role);
    test.skip(!persona, 'nobody on this database to cast in the role');
    if (!persona) return;
    const pair = await openPair(browser);
    try {
      await signInPair(pair, persona);
      for (const [i, step] of persona.steps.entries()) {
        await capturePair(pair, persona, i + 1, step);
      }
    } finally {
      await closePair(pair);
    }
  });
}
