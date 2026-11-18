# Backend Development Guide

## Architecture

The Go API is organized as:

- `cmd/server`: HTTP server entry point.
- `cmd/seed`: idempotent demo-data seeder.
- `internal/config`: environment-based configuration.
- `internal/database`: MySQL connection and migrations.
- `internal/models`: GORM data models.
- `internal/handlers`: request validation and HTTP responses.
- `internal/middleware`: authentication and security headers.
- `internal/service`: reusable financial rules.
- `internal/routes`: API registration under `/api/v1`.

## Commands

```powershell
Copy-Item .env.example .env
go mod tidy
go run ./cmd/server
go run ./cmd/seed
gofmt -w .
go vet ./...
go test ./...
```

## API conventions

- Protected routes receive the authenticated ID through Gin context key `userID`.
- Every resource query must scope data to that ID. A record belonging to another user returns `404`, never data.
- Validate request JSON before changing the database. Use `400` for invalid input and `409` for duplicate/conflicting data.
- Keep handlers thin. New reusable business calculations belong in `internal/service`; database-specific logic should be kept separate as the project grows.
- Use parameterized GORM operations only. Do not interpolate request input into SQL.
- Category type defines transaction type; do not add a type column to transactions.

## Adding an endpoint

1. Add/update a model only if storage changes are needed.
2. Add business rule helpers in `internal/service`.
3. Implement JSON input/output in `internal/handlers`.
4. Register the endpoint in `internal/routes/routes.go`.
5. Add unit/integration coverage.
6. Update the API table in the root README.

## Security checklist

- Passwords are bcrypt hashes at cost 12 only.
- Access JWTs last 15 minutes; refresh JWTs last 7 days and use a separate secret.
- Never log passwords, bearer tokens, refresh cookies, or secret values.
- Keep CORS restricted to `CORS_ORIGIN` and enable credentials only for the trusted frontend.
