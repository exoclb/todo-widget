# Domain Docs

This repo uses a single-context domain layout.

Domain glossary:

```txt
CONTEXT.md
```

Architectural decisions:

```txt
docs/adr/
```

Agent guidance:

- Read `CONTEXT.md` before naming product concepts in issues or implementation plans.
- Read relevant ADRs in `docs/adr/` before changing platform, overlay, task state, or widget boundaries.
- Keep `CONTEXT.md` as a glossary only. Do not add implementation details there.
- Add ADRs sparingly when a decision is hard to reverse, surprising without context, and the result of a real trade-off.
