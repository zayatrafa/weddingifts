# Mobile Test Report

Use this file to record mobile validation results before each go-live or release candidate.

## Test matrix

| Device width | Browser | Screen/flow | Result (OK/Falhou) | Evidence | Notes |
|---|---|---|---|---|---|
| 360px | Chrome | register -> login -> create-event |  |  |  |
| 390px | Safari | register -> login -> create-event |  |  |  |
| 412px | Chrome | my-events actions and dropdown |  |  |  |
| 430px | Safari | my-events actions and dropdown |  |  |  |
| 360px | Chrome | event public reserve/unreserve |  |  |  |
| 390px | Safari | event public reserve/unreserve |  |  |  |
| 412px | Chrome | my-guests CRUD |  |  |  |
| 430px | Safari | my-event CRUD + reservations history |  |  |  |

## Acceptance gates

- No critical button outside viewport.
- No unreadable label or broken action text.
- No required field without visible validation feedback.
- No JS console errors in critical flows.
- Status/error messages visible without excessive scrolling.

## Current sprint notes

- Session sync between tabs validated manually.
- Public event filter section adjusted for small screens.
- Quick action icon buttons adjusted to larger touch targets.
