---
created: 2026-11-18
updated: 2026-11-18
---

# Review gallery — `test` beside `main`, screen by screen

Before `test` goes to production, the person deciding the test → main PR looks
at what people will actually see. The flows (`tests/flows/`) prove the app
works; they sign in as English-locked role accounts and assert. This gallery
asserts nothing: it shows every main screen of each role, in Polish, on a
desktop and a phone, with the version on `main` next to the version on `test`
and the pixels that differ marked in red. Changed and broken screens come
first; unchanged ones are folded away.

## How a run works

| Step                                                                                                                                                                 | Where                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Clone `main` once into `~/.cache/strummy-review/main`, rebuild it only when main, the env or Node changed                                                            | `run-review.sh`                                                             |
| Build the `test` checkout the workflow is on                                                                                                                         | `run-review.sh` (shared build code: `scripts/e2e-remote/app-server.lib.sh`) |
| Serve both with `next start` (`test` on :3600, `main` on :3610), same `.env.local`, same database                                                                    | `run-review.sh`                                                             |
| Sign in as the same person on both, open each screen on both **at the same moment**, screenshot both, let Playwright's comparator decide "changed" and draw the diff | `tests/review/review-pair.ts`                                               |
| Who and which screens: the copy's busiest teacher, that teacher's busiest student, a parent with a child, plus the public pages                                      | `tests/review/review-cast.ts` (people: `tests/helpers/copy-cast.ts`)        |
| `manifest.jsonl` → `index.html` + `summary.md`                                                                                                                       | `build-gallery.mjs`, `gallery-page.mjs`                                     |
| Publish to `~/strummy-review/<test sha>/` on uwh, keep the newest 20                                                                                                 | `run-review.sh`                                                             |
| File `summary.md` + the link as section `screens` on the PR's review page in home-ops                                                                                | `post-section.sh`                                                           |

Both sides are captured together on purpose. Rendered one after the other, the
first pass's sign-in shows up as "active now" on the second, and a weekly
refresh of the copy changes every list — the diff would be noise unrelated to
the code. Running `main`'s build against the `test` database is safe by the
migration rule: every migration must work with the code already running
(`.claude/rules/migrations.md`, expand → contract).

Workflow: `.github/workflows/review-gallery.yml` — after `Deploy DB` succeeds on
`test`, when the test → main PR is opened, or `gh workflow run review-gallery.yml`
(`-f force=true` renders again for the same commits).

## Where to look

`http://192.168.1.75:9877/<test sha>/index.html` — LAN only (off the LAN,
through Tailscale via the Pi's subnet route). Not GitHub Pages, not an
artifact: the repo is public and these are screenshots of a production copy,
anonymised or not. The review page in home-ops links to it.

## Adding a screen

Add a `step(key, title, path)` to the persona in `tests/review/review-cast.ts`.
A step is a URL only — the same list runs on both builds, and a click that
exists on one side would break the other. Something that changes between two
renders a second apart (a clock, "2 min ago") gets `data-review-mask` in the
component; it is painted over on both sides.

Images from outside the app — Spotify covers, storage uploads — are a grey
square on both sides: they are data, not the code under review, and 50+ covers
per list loading twice at once from a CDN raced the screenshot (the same code
showed as "changed"). The app's own images load normally. A sign-in that the
rate limiter refuses shows as "wylogowało do /sign-in" on every screen of that
person; `run-review.sh` clears `auth_rate_limits` once per run.

## Running it by hand (uwh)

```bash
cd <a test checkout> && scripts/test-stack/e2e-env.sh .env.local
scripts/review/run-review.sh                    # REVIEW_FORCE=1 to re-render
REVIEW_CAST=roles ...                           # dev's role accounts instead of the copy
REVIEW_MAIN_REF=<sha> ...                       # compare against another commit
rm .env.local
```

## One-time setup on uwh (owner)

The static server for the galleries is a user unit (no sudo):

```bash
cp scripts/review/strummy-review-gallery.service ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now strummy-review-gallery
curl -sI http://192.168.1.75:9877/ | head -1      # 200
```

Filing on the review page needs home-ops #87 (`POST /api/reviews/sections`)
deployed; until then `post-section.sh` prints a warning and the gallery is
still published. The token is read from the file pr-decide uses
(`~/code/logs-stack/ops/elitedesk/seo-collect.env`), never printed.

Disk: about 3.6 GB for `main`'s clone (node_modules + build, measured 2026-11-18) and a few MB per
gallery.
