// A run that loses a step must say so. The persona test records every step it
// reaches, but a crash that escapes it (browser gone, timeout) leaves later
// steps out of manifest.jsonl, and a missing line looks exactly like a screen
// that was never meant to exist. cast.json lists what was meant to be shot, so
// every (persona, step, device) it names without a manifest line becomes an
// error entry.
export function missingEntries(cast, entries, projects) {
  const seen = new Set(entries.map((e) => `${e.persona}/${e.step}/${e.project}`));
  const none = { file: '', http: null, url: '', errors: [] };
  const missing = [];
  for (const persona of cast) {
    for (const [i, step] of (persona.steps ?? []).entries()) {
      for (const project of projects) {
        if (seen.has(`${persona.key}/${i + 1}/${project}`)) continue;
        missing.push({
          project,
          persona: persona.key,
          personaLabel: persona.label ?? persona.key,
          hasCredentials: !!persona.email,
          step: i + 1,
          key: step.key,
          title: step.title,
          path: step.path,
          status: 'error',
          captureError: 'brak wpisu w manifeście — krok się nie wykonał',
          main: none,
          test: none,
          diff: null,
        });
      }
    }
  }
  return missing;
}

// Why a screen on `test` counts as broken, in one line. The HTTP status comes
// before the URL: a /sign-in that answers 500 is a server error, not a logout.
// "Logged out" only makes sense for someone who signed in at all.
export function problem(shot) {
  if (shot.captureError) return `nie udało się zrobić zrzutu: ${shot.captureError.slice(0, 120)}`;
  const { test } = shot;
  if (test.errors.length) return `błąd JS: ${test.errors[0].slice(0, 120)}`;
  if ((test.http ?? 0) >= 400) return `HTTP ${test.http}`;
  if (shot.hasCredentials && /sign-in/.test(test.url)) return 'wylogowało do /sign-in';
  return `HTTP ${test.http ?? 'brak odpowiedzi'}`;
}
