# CLAUDE.local.md (personal, gitignored)

## About me

Solo founder/owner of Strummy. Deep knowledge of the full stack — Next.js, Supabase, RLS, AI integrations, Vercel deployment, the lot. No need to explain framework basics.

## Communication preferences

- **Plan before coding** for non-trivial tasks — propose approach before implementing.
- **Explain tradeoffs** when making non-obvious architectural or design choices.
- Don't summarize what you just did — I can read diffs.

## Local dev

- Dev credentials: see bottom of CLAUDE.md
- Local Supabase on port 54321 (Docker)
- Worktrees are nested in `.claude/worktrees/` (auto-discovered)

## Production Test Accounts (StudentProduction — real prod DB)

Created 2026-07-30 for QA against the live production stack. See CLAUDE.md's
"Production Test Accounts" section for context/rules.

- Teacher: `p.romanczuk+testteacher@gmail.com` / `TestTeacher_Prod2026!`
- Student: `p.romanczuk+teststudent@gmail.com` / `TestStudent_Prod2026!`
  (role assignment on this one is currently blocked by a known bug — "Invalid
  request body" when saving the Student role checkbox — see the production
  bug sweep findings)
