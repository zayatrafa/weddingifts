# Mobile Testing

**Analyzed:** 2026-04-27

Mobile support is part of MVP scope. Automated mobile coverage is not yet confirmed, so this checklist remains required for frontend changes that affect layout, navigation, forms, public event flow, auth/session behavior, or shared CSS.

## Minimum Scope

Validate on a narrow phone viewport and, when possible, a real phone on the same LAN:

- Home
- Register
- Login
- Create event
- My events
- My guests
- My event / gifts
- Public event
- Account
- Mobile drawer/header
- Session redirects

## Global Approval Criteria

- No horizontal overflow.
- Header and drawer are usable by touch.
- Main actions remain visible.
- Text remains readable.
- Form fields are not cramped.
- Buttons have adequate tap targets.
- Status/error/success messages do not overlap content.
- Modals, dropdowns, and menus can be closed.
- Keyboard interaction does not trap the user.

## Header and Navigation

- Mobile menu opens and closes.
- Overlay closes drawer.
- Escape closes drawer when tested on desktop emulation.
- Focus moves into drawer and returns when closed.
- Authenticated links differ from public links.
- Logout remains reachable.
- Current page indication is coherent.

## Page Checks

### Home

- Hero content fits first viewport.
- Main CTAs are reachable.
- Links do not overflow.

### Register

- All fields fit.
- CPF/date/password fields are readable.
- Validation messages appear near the form.
- Post-registration redirect remains correct.

### Login

- `returnTo`, logout, and expired-session messages fit.
- Submit button remains visible when keyboard opens.

### Create Event

- Enriched event fields are usable.
- Date/time and time-zone controls fit.
- Maps/cover URL fields do not overflow.
- Submit state is clear.

### My Events

- Event cards remain scannable.
- Edit/delete/copy/actions fit and remain tappable.
- Focused event state does not break layout.

### My Guests

- Event selector is usable.
- Guest cards show RSVP, companion count, and reservation indicators without overflow.
- Edit form remains usable.

### My Event / Gifts

- Gift form is usable.
- Gift cards keep edit/delete actions visible.
- Reservation history remains readable.

### Public Event

- Slug and CPF inputs are usable.
- Gift cards show availability clearly.
- Reserve/cancel actions work.
- RSVP lookup, accepted/declined controls, companion count, companion fields, and submit state fit.
- Companion CPF help text does not overlap.

### Account

- Password change form fits.
- Current/new password errors are readable.

## Session and Redirects

- Private pages redirect to login when session is missing or expired.
- `returnTo` returns to intended internal page.
- Logout clears state and shows feedback.
- Cross-tab/session expiration behavior remains sane where manually testable.

## Execution Record Template

```markdown
## Mobile Validation Record

- Date:
- Device/viewport:
- Browser:
- Build/branch:
- Pages checked:
- Issues found:
- Result: Pass / Fail / Partial
```

## Re-run Triggers

Re-run mobile checks when changing:

- `Weddingifts-web/styles.css`
- `Weddingifts-web/js/common.js`
- Any page HTML
- Auth/session/redirect flows
- Public event, RSVP, guest, gift, or event-management UI
- Shared button/form/card components
