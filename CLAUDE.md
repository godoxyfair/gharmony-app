# CLAUDE.md

## Project

Next.js App Router frontend for GHarmony platform. TypeScript, Tailwind CSS, Framer Motion, Headless UI.

## Dev server

```bash
yarn dev
```

## Rules

- NEVER read any `.env` files (`.env`, `.env.local`, `.env.*`)
- No comments unless WHY is non-obvious
- No abstractions beyond task scope
- No error handling for impossible scenarios
- No trailing summaries in responses

## Poject rules
- read PROJECT.md to undrestand project look here when you need to understed project idea

## Architecture
- read ARCHITECTURE.md for project architecture, look here before feature implementation

## Security

### Auth & Cookies
- Tokens only in httpOnly cookies — never localStorage, sessionStorage, or React state (CWE-922, OWASP A02:2025)
- Cookie attrs hardcoded in Next.js: `httpOnly: true`, `secure: NODE_ENV === 'production'`, `sameSite: 'lax'` — never trust Python response for these
- Token check in middleware: validate JWT `exp` — `Boolean(token)` is not sufficient
- Redirect after auth: positive path check — `from.startsWith('/') && !from.startsWith('//')` (CWE-601, OWASP A01:2025)

### Environment Variables
- `NEXT_PUBLIC_*` — only non-secret values: public URLs, OAuth entry points, analytics IDs
- Internal service URLs and secrets: server-only env vars, never `NEXT_PUBLIC_` (CWE-200, OWASP A02:2025)

### API Routes
- Validate all incoming client data with Zod before processing (CWE-20, OWASP A03:2025)
- Return generic error messages to client — log details server-side via `Log.error`, never stack traces or internal details
- GET only for reads; POST/PATCH/DELETE for mutations

### Client Components
- Never `console.log` passwords, tokens, or PII — even in dev (CWE-312)
- Dynamic URLs in `href`/`src`: validate protocol is `http:` or `https:` before use (CWE-79, CWE-601)
- `dangerouslySetInnerHTML` requires DOMPurify sanitization — never with raw user input (CWE-79, OWASP A03:2025)
- Client-side auth checks (show/hide UI elements) are UX only — server always enforces authorization (CWE-602, OWASP A01:2025)
- Validate props received from external sources before use — never assume structure (CWE-20)

### API Responses
- Validate API response structure before use — extract only expected fields, never spread raw response into state (CWE-20)

### Forms
- Validate all form inputs with Yup/Zod schemas before submitting (CWE-20, OWASP A03:2025)
- Never pass raw form values directly to API without schema validation

### File Uploads
- Validate file type and size client-side before upload
- Validate URL protocol (`http:`/`https:` only) before storing linked URLs

### CSRF
- `sameSite: 'lax'` + same-origin API calls provide baseline CSRF protection (CWE-352, OWASP A01:2025)
- POST/PATCH/DELETE requests must include `X-CSRF-Token` header in `apiRequest` if cross-origin access is added (CWE-352, OWASP A01:2025)
- Never trigger state-changing operations from GET requests

### Dependencies
- Run `yarn audit` before releases and periodically (CWE-1104, OWASP A06:2025)

## Stack

- **Framework**: Next.js 15 App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: Formik
- **Animation**: Framer Motion
- **UI primitives**: Headless UI, Floating UI
- **HTTP**: Axios
- **Package manager**: yarn

## Structure

- `app/[locale]/` — locale-scoped routes
- `app/_components/` — shared UI components library
- `app/_styles/_variables.css` — CSS variables/mixins from Figma layouts (colors, spacing, etc.) with Tailwind

- `app/api/` — API functions grouped by domain; `app/api/utils/apiRequest.ts` — base Axios wrapper used by all API functions
- `src/types/` — TypeScript types grouped by domain
- `src/localization/` — `en.json`, `ru.json`; `src/i18n/` — next-intl config
- `src/constants/` — app-wide constants (errors, regex, etc.)
- `src/store/` — global state
- `src/utils/` — shared utility functions

### Other (`src/`)

- `src/store/useStore.ts` — global state store
- `src/utils/helpers.ts` — general utility functions
- `src/utils/logger.ts` — logging utility (`Log.error`, etc.)