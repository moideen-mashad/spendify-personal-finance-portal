# Frontend Development Guide

## Architecture

For the new Spendify UI, read `UI_ARCHITECTURE.md`. Active routes use `AppShell`, `OverviewPage`, `TransactionsPage`, and `WorkspacePages`; the old `AppPages` module is retained for the Categories route only. Theme/layout tokens live in `src/fintech.css`. Keep changes frontend-only unless explicitly requested otherwise.

- `src/api`: Axios client and authorization behavior.
- `src/context`: in-memory authentication state.
- `src/components`: shared layout and route guards.
- `src/pages`: page-level screens mapped in `src/main.tsx`.
- `src/types`: shared API response types.
- `src/utils`: formatting and small pure helpers.

## Commands

```powershell
Copy-Item .env.example .env
npm install
npm run dev
npm run format
npm run build
npm test
```

## UI and state rules

- Use `MonthPicker`/`DatePicker` from `components/ui/date-picker.tsx` for calendar controls; keep API values in `YYYY-MM`/`YYYY-MM-DD` form. Calendar styles are in `src/calendar.css`.
- Routes are lazy-loaded in `main.tsx`, with per-page error boundaries and Suspense skeletons. Use `SafePanel` for independently recoverable widgets and `LoadingStates.tsx` for table/chart/budget placeholders. Error boundaries catch rendering errors; keep request failures in explicit error state or catch handlers.

- Use the shared `components/ui/select.tsx` for single-select dropdowns. Pass typed options and integrate React Hook Form using `Controller`; do not attach `register` directly to the custom trigger. Shared styles live in `src/select.css`.

- Use strict TypeScript. Do not introduce `any`.
- Keep API types in `src/types`, rather than declaring one-off response types in pages.
- Use the configured Axios client from `src/api/client.ts`; do not create duplicate clients.
- The access token is in memory only. Do not use localStorage, sessionStorage, or query parameters for tokens.
- Protected pages must be nested beneath `ProtectedRoute` in `src/main.tsx`.
- Format amounts through `utils/format.ts` using the logged-in user's currency.
- Retain accessible labels for inputs and buttons. Use semantic controls before custom div-based interactions.
- Use Tailwind utility classes and the shared `card`/`nav` classes in `src/index.css` for consistency.

## Adding a page

1. Create the page in `src/pages`.
2. Add its route in `src/main.tsx` and navigation entry in `components/Layout.tsx` if appropriate.
3. Add API types to `src/types` and API calls through the shared client.
4. Cover pure helper logic with Vitest tests.
5. Run `npm run format`, `npm run build`, and `npm test`.

## Customization map

- Application title and sidebar links: `src/components/AppShell.tsx`.
- Colors and global base styling: `src/fintech.css`, `src/index.css`, `tailwind.config.js`.
- Route behavior: `src/main.tsx`.
- Login/session restoration: `src/context/AuthContext.tsx`.
- API proxy: `vite.config.ts`.
