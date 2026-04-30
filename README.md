# Insighta Labs+ Portal (Frontend)

A lightweight server-rendered internal web portal that consumes the existing Insighta backend API.

## Stack

- Node.js (ES modules)
- Express
- EJS templates (minimal SSR)
- `express-session` for secure HTTP-only session cookies
- `csurf` for CSRF protection

## What this portal does

- GitHub login through backend-managed OAuth flow
- Cookie-based authenticated portal session
- Dashboard with backend metrics
- Profiles listing with filters, sorting, pagination
- Profile detail page by id
- Natural language search page
- Account page with current user and role
- Admin-only action visibility based on backend role

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment file from example:

   ```bash
   cp .env.example .env
   ```

3. Update `.env` values to point to your running backend.

4. Start the portal:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Authentication flow

1. User visits `/login`.
2. User clicks "Continue with GitHub".
3. Portal redirects to backend GitHub OAuth start endpoint.
4. Backend handles GitHub OAuth and redirects back to portal callback.
5. Portal exchanges callback code with backend and receives backend session token.
6. Portal stores token server-side in session (HTTP-only cookie identifier in browser).

## Session handling

- Session cookie name: `insighta.sid`
- Cookie flags:
  - `httpOnly: true`
  - `sameSite: lax`
  - `secure: true` in production
- Backend access token is stored in server session only (`req.session.backendToken`)
- Token is never sent to browser JavaScript
- CSRF token is required for browser POST actions (`/logout`, admin sync)

## Backend API integration

All backend requests are made via `src/services/backendClient.js`.

- Sends `X-API-Version: 1` on every request
- Sends backend bearer token from server session
- Uses backend endpoints configured in environment variables

## Page structure

- `/login`: GitHub login entry
- `/dashboard`: metrics and highlights, with admin actions when role is `admin`
- `/profiles`: list + filter/sort/paginate
- `/profiles/:id`: single profile detail
- `/search`: natural language query interface
- `/account`: current user identity and role

## Role-based behavior

- Authenticated user identity and role are fetched from backend (`/auth/me`)
- Route protection blocks unauthenticated access
- Admin-only UI actions are only rendered for users with `role=admin`
- Non-admin users do not see admin action controls

## Tests

Run route and rendering tests:

```bash
npm test
```

Current tests cover:

- redirect for unauthenticated dashboard access
- dashboard rendering for authenticated users
- admin action visibility by role

## Deployment notes

- Use HTTPS in all non-local environments
- Set a strong `SESSION_SECRET`
- Set `PORTAL_BASE_URL` and backend URLs correctly for OAuth callback integrity
- Keep backend and portal session policies aligned
- If portal and backend are on different origins, configure backend CORS minimally and only as needed

## Folder layout

- `src/app.js`: app wiring and middleware
- `src/routes/`: route definitions
- `src/controllers/`: request handlers
- `src/services/backendClient.js`: backend API client
- `src/views/`: EJS pages + partials
- `src/middleware/`: auth, locals, flash
- `src/public/`: static assets
