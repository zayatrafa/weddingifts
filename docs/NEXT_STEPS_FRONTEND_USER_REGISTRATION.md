# Next Steps - Frontend User Registration

Goal: implement a user registration screen in `Weddingifts-web` without changing project architecture.

## Scope

- Add user registration form (name, email, password)
- Integrate with `POST /api/users`
- Show loading, success, and error messages
- Preserve existing event + gifts flow

## Suggested implementation plan

1. Update `Weddingifts-web/index.html`

- add a new panel section for registration
- include inputs: name, email, password
- add submit button
- add area for feedback message

2. Update `Weddingifts-web/app.js`

- create helper to submit user registration request
- reuse API base URL already present on page
- parse `ProblemDetails` errors and display `detail`
- disable submit button while request is running
- clear or keep form fields based on success behavior chosen

3. Update `Weddingifts-web/styles.css`

- style the new registration section consistently with existing visual language
- keep responsive behavior for mobile

## Acceptance criteria

- valid payload creates user and returns success feedback
- invalid payload (e.g. short password) shows backend validation message
- no regressions in event loading and reservation actions

## Quick manual test

1. Start backend (`dotnet run` in `Weddingifts.Api`)
2. Start frontend static server (`py -m http.server 5500` in `Weddingifts-web`)
3. Open `http://localhost:5500`
4. Submit registration form with:
   - valid data -> expect success
   - invalid password (< 6 chars) -> expect error message from backend

## Useful endpoint

- `POST /api/users`
