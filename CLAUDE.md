# Finance Portal: Developer Guide

This repository is a Personal Finance Management Portal for an MCA final-year project.

## Project layout

- `backend/`: Go 1.22 Gin API, GORM models, MySQL integration, JWT security, and demo seeder.
- `frontend/`: React 18, TypeScript, Vite, Tailwind UI.
- `docker-compose.yml`: local MySQL 8 instance.
- `README.md`: setup and run instructions for developers and evaluators.

Read the nearest `CLAUDE.md` before changing either application.

## Local workflow

1. Start MySQL: `docker compose up -d`.
2. Run the backend from `backend/`: `go run ./cmd/server`.
3. Run the frontend from `frontend/`: `npm run dev`.
4. Seed demonstration data from `backend/`: `go run ./cmd/seed`.

## Cross-project rules

- Never commit `.env` files, passwords, DSNs, or JWT secrets. Maintain only `.env.example`.
- Keep API data JSON camelCase; errors use `{ "error": "message" }`.
- Money uses MySQL `DECIMAL(12,2)` and Go `decimal.Decimal`—never float types.
- Dates crossing the API use `YYYY-MM-DD`.
- Do not store access tokens in localStorage. The access token stays in React memory; refresh token is an HttpOnly cookie.
- Run frontend checks before handing off: `npm run format`, `npm run build`, and `npm test`.
- Run backend checks when Go is installed: `gofmt -w .`, `go vet ./...`, and `go test ./...`.

## Common customizations

- Branding, navigation, and global UI: `frontend/src/components/Layout.tsx` and `frontend/src/index.css`.
- Frontend routes: `frontend/src/main.tsx`.
- API base URL and authorization header: `frontend/src/api/client.ts`.
- Database entities: `backend/internal/models/models.go`.
- API endpoints: `backend/internal/routes/routes.go` and `backend/internal/handlers/handlers.go`.
- Default categories: `backend/internal/handlers/handlers.go`.
- Screenshot/demo content: `backend/cmd/seed/main.go`.
