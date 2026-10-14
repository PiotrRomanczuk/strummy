---
created: 2026-06-16
updated: 2026-10-14
---

# Strummy — Architecture (moved)

The architecture reference now lives at **[`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md)**,
rewritten 2026-10-14 from the code (the July version described a `user_role` enum,
a `lib/database` routing layer and Vercel Analytics that the app no longer has).

Pointers for the links that used to land here:

- Auth, RBAC and RLS mechanics → `docs/ARCHITECTURE.md` §4 (request & data flow) and §6 (database & security boundary)
- AI system internals → `docs/ARCHITECTURE.md` §7 (integrations) and `docs/app-blueprint/08-ai-assistant.md`
- Rate limiting and lockout → `docs/ARCHITECTURE.md` §4 and `docs/app-blueprint/01-identity-access.md`
- Decisions → `docs/app-blueprint/adr/`
