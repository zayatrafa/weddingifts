# Codebase Concerns

**Analysis Date:** 2026-04-27

## Tech Debt

**Legacy or auxiliary files may confuse maintenance:**

- Issue: Some files appear unrelated to the active product flow.
- Files: `Weddingifts-web/app.js`, `Weddingifts.Api/Controllers/TestController.cs`, `Weddingifts.Api/Controllers/WeatherForecastController.cs`, `Weddingifts.Api/WeatherForecast.cs`
- Impact: Agents or maintainers may assume these files are part of the active architecture.
- Fix approach: Confirm usage, then remove or explicitly document as development-only/legacy in a focused cleanup.

**Frontend smoke and Playwright startup paths are Windows-oriented:**

- Issue: Smoke flow intentionally uses Windows commands and `py`.
- Files: `playwright.config.js`, `frontend-smoke/run-smoke.mjs`
- Impact: Local smoke execution may require adjustment on non-Windows machines.
- Fix approach: Keep CI behavior documented and add cross-platform startup only if development expands beyond Windows.

## Security Considerations

**Historical secrets exposure:**

- Risk: Older secrets reportedly passed through Git history.
- Files: historical versions of `Weddingifts.Api/appsettings.json` and `Weddingifts.Api/appsettings.Development.json`
- Current mitigation: Current files use placeholders and runtime configuration via User Secrets or environment variables.
- Recommendation: Treat old credentials/keys as compromised if reused elsewhere; rotate before any real deployment.

**`.specs` and `old` are now versionable:**

- Risk: Content that used to be ignored under `docs/` may be committed.
- Files: `.specs/**`, `old/**`
- Current mitigation: Migration preserves content intentionally.
- Recommendation: Review docs for private/sensitive details before pushing to a remote repository.

## Fragile Areas

**Authentication and session behavior:**

- Files: `Weddingifts.Api/Services/AuthService.cs`, `Weddingifts.Api/Security/JwtTokenService.cs`, `Weddingifts-web/js/common.js`, `Weddingifts-web/js/login.js`
- Why fragile: Backend auth, local session expiration, redirect semantics, and `returnTo` safety are tightly coupled.
- Safe modification: Update backend and frontend together, then run backend tests and frontend smoke when relevant.
- Test coverage: Backend integration and smoke cover core auth flows, but edge redirects still need careful review.

**Reservation and RSVP business rules:**

- Files: `Weddingifts.Api/Services/GiftService.cs`, `Weddingifts.Api/Services/EventRsvpService.cs`, `Weddingifts.Api/Services/EventGuestService.cs`
- Why fragile: Rules depend on CPF normalization, invited guest membership, reservation quantities, companion age, event time zone, and reset behavior.
- Safe modification: Start with feature spec, map domain rules, and add/adjust integration tests first or alongside changes.
- Test coverage: Good backend coverage exists; frontend smoke covers critical public behavior.

**Shared frontend utilities and global CSS:**

- Files: `Weddingifts-web/js/common.js`, `Weddingifts-web/styles.css`
- Why fragile: Changes can impact all pages, private sessions, mobile navigation, status messages, and layout.
- Safe modification: Review affected pages and run smoke/manual mobile checks.
- Test coverage: Smoke covers selected flows; mobile is still manual.

## Missing Critical Features

**Automated mobile coverage:**

- Problem: Mobile behavior depends on manual checklist.
- Current workaround: Use `.specs/codebase/MOBILE_TESTING.md`.
- Blocks: Higher confidence before MVP delivery on mobile-heavy guest flows.
- Implementation complexity: Medium, likely Playwright viewport coverage for selected flows.

**Production deployment runbook:**

- Problem: No confirmed production deployment/infra process.
- Current workaround: Local development and CI are documented.
- Blocks: Go-live readiness.
- Implementation complexity: Depends on hosting decision.

## Test Coverage Gaps

**Frontend beyond smoke paths:**

- What's not tested: Full matrix of edge cases across all pages and responsive states.
- Risk: UI regressions outside smoke flows can slip.
- Priority: Medium before MVP delivery.
- Difficulty: Moderate; requires viewport strategy and stable selectors.

**Mobile-specific behavior:**

- What's not tested: Drawer usability, touch targets, overflow, form layout on real mobile.
- Risk: Public guest flow and private management may degrade on mobile.
- Priority: High for MVP readiness.
- Difficulty: Moderate to automate; currently manual.

---

_Concerns audit: 2026-04-27_
_Update as issues are fixed or new ones are discovered._
