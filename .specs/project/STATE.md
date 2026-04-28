# State

**Last Updated:** 2026-04-27
**Current Work:** `invitation-acceptance-flow` implementation

---

## Recent Decisions (Last 60 days)

### AD-001: `.specs` becomes the documentation source of truth (2026-04-27)

**Decision:** Migrate living project documentation from root/docs Markdown files to `.specs/`, following the `tlc-spec-driven` organization.
**Reason:** The project owner prefers the structure and agent workflow of `tlc-spec-driven` for planning, implementation, validation, and handoff.
**Trade-off:** Root `README.md` and `AGENTS.md` will be archived, so future tools may not auto-load project instructions unless explicitly pointed to `.specs`.
**Impact:** Agents must use `.specs/project/*` and `.specs/codebase/*` as the primary documentation context.

### AD-002: Archive old docs without deleting content (2026-04-27)

**Decision:** Move old documentation to `old/`, preserving original relative paths.
**Reason:** Avoid losing historical context while preventing old docs from competing with `.specs`.
**Trade-off:** The repository will contain both migrated docs and archived docs, but only `.specs` is live.
**Impact:** `old/` is reference-only and must not be updated as living documentation.

### AD-003: Version `.specs` and `old` in Git (2026-04-27)

**Decision:** New `.specs/` documentation and archived `old/` docs are versionable.
**Reason:** The project owner wants the new documentation architecture to be part of the project state going forward.
**Trade-off:** Information that was previously private/local under `docs/` may become versioned.
**Impact:** Review sensitive content before publishing remotely.

### AD-004: Public invitation shell reuses current RSVP/gift internals until later slices (2026-04-27)

**Decision:** T4 replaces the primary public slug-input path with `event.html?slug={slug}` and CPF lookup, while preserving existing RSVP and gift behavior under the new shell for T5/T6 to reorganize.
**Reason:** The task sequence calls for shell/lookup first, then RSVP and gifts as separate vertical slices.
**Trade-off:** `event.js` temporarily contains compatibility paths for the existing RSVP/gift smoke coverage.
**Impact:** T5/T6 should move those preserved behaviors into the guided stepper without treating the compatibility layer as final architecture.

---

## Active Blockers

No active blockers recorded.

---

## SPEC_DEVIATION Log

### SPEC_DEVIATION-001: Mobile advance action still inline during T9 validation (2026-04-27)

**Detected:** During final mobile validation for `invitation-acceptance-flow`.
**Conflict:** `.specs/features/invitation-acceptance-flow/design.md` requires the public invitation advance action to be fixed in the lower-right area on mobile, while the current `event.html`/`styles.css` implementation still renders the action inline under the CPF field.
**Decision:** Apply a scoped frontend fix: wrap invitation action buttons in `.invitation-fixed-action`, use mobile-only fixed positioning, reserve bottom padding, and disable transform animation on `.invitation-step-card` so `position: fixed` is viewport-relative.
**Status:** Resolved - 2026-04-27.
**Validation:** `cmd /c npm run test:frontend-smoke` passed with 8 tests, and mobile validation confirmed `position=fixed`, `right=16`, `bottom=16`, with no horizontal overflow at 390x844.

---

## Lessons Learned

### L-001: Keep planning docs separate from historical docs

**Context:** The project had strong documentation in `/docs`, but adopting `.specs` risks duplicate sources.
**Problem:** If both folders stay live, agents and humans can follow stale guidance.
**Solution:** Treat `.specs` as live and `old` as archive.
**Prevents:** Documentation drift between two active systems.

### L-002: `AGENTS.md` removal has agent-loading implications

**Context:** Root `AGENTS.md` was previously an automatic operational source for agents.
**Problem:** Archiving it may reduce automatic instruction loading in future sessions.
**Solution:** Keep agent rules migrated into `.specs/codebase/CONVENTIONS.md` and explicitly reference `.specs` in future prompts.
**Prevents:** Silent loss of project operating rules.

---

## Quick Tasks Completed

| # | Description | Date | Commit | Status |
| --- | --- | --- | --- | --- |
| 001 | Installed `tlc-spec-driven` Codex skill | 2026-04-26 | Pending | Done |

---

## Deferred Ideas

- [ ] Add automated mobile viewport smoke coverage.
- [ ] Decide whether to restore a minimal root `README.md` later as a pointer to `.specs`.
- [ ] Decide whether to restore a minimal root `AGENTS.md` later if automatic agent loading becomes more valuable than a docs-only `.specs` layout.
- [ ] Create first feature spec under `.specs/features/` for private RSVP counts.

---

## Todos

- [ ] Review `.specs` for sensitive content before pushing remotely.
- [ ] Use `.specs/features/<feature>/spec.md` for the next medium/large feature.

---

## Preferences

**Model Guidance Shown:** never
