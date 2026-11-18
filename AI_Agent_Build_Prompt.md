# AI Agent Build Prompt: Personal Finance Management Portal

Copy everything below the line into your AI coding agent (Claude Code, Cursor, Copilot Agent, etc.) in an empty folder.

---

You are a senior full-stack engineer. Build a complete, working, production-quality **Personal Finance Management Portal** exactly as specified below. This is an MCA final-semester project, so the code must be clean, well structured, tested and easy to explain in a viva. Do not ask me questions unless something is truly blocking; make sensible choices, state them in the README, and keep going. After each phase, compile/run it and fix errors before moving on.

## 1. Goal

A secure web portal where a registered user can record income and expenses, organise them in categories, set monthly budgets, and see charts and reports.

Required features: **charts and reports, CRUD operations, secure login, database integration.**

## 2. Tech stack (fixed)

- **Back end:** Go 1.22+, Gin (`github.com/gin-gonic/gin`), GORM (`gorm.io/gorm`, `gorm.io/driver/mysql`), `github.com/golang-jwt/jwt/v5`, `golang.org/x/crypto/bcrypt`, `github.com/shopspring/decimal`, `github.com/joho/godotenv`, `github.com/gin-contrib/cors`, a rate limiter (e.g. `github.com/ulule/limiter/v3` or a small in-memory limiter).
- **Database:** MySQL 8.0.16+ (CHECK constraints must work).
- **Front end:** React 18 + TypeScript (strict mode) + Vite, React Router v6, Axios, Recharts, Tailwind CSS, `react-hook-form` + `zod` for forms, `date-fns`.
- **Testing:** Go `testing` + `net/http/httptest` (+ `testify` if you like); Vitest + React Testing Library on the front end.
- **Dev tooling:** `docker-compose.yml` with a MySQL 8 service, `.env.example` files, a `README.md` with exact run steps, `gofmt`/`go vet` clean, ESLint + Prettier on the front end.

## 3. Repository structure (use exactly this)

```
finance-portal/
|-- backend/
|   |-- cmd/server/main.go
|   |-- cmd/seed/main.go              demo-data seeder (see section 9)
|   |-- internal/
|   |   |-- config/        env configuration
|   |   |-- database/      MySQL connection + migrations runner
|   |   |-- models/        User, Category, Transaction, Budget
|   |   |-- repository/    all DB access (always scoped by user_id)
|   |   |-- service/       business rules + report calculations
|   |   |-- handlers/      auth, user, category, transaction, budget, report
|   |   |-- middleware/    JWT auth, CORS, rate limit, request logging
|   |   `-- routes/        route registration
|   |-- migrations/001_init.sql
|   |-- go.mod / go.sum
|   `-- .env.example
|-- frontend/
|   |-- src/{api,components,context,hooks,pages,types,utils}
|   |-- index.html, tailwind.config.js, vite.config.ts, package.json
|   `-- .env.example
|-- docker-compose.yml
`-- README.md
```

## 4. Database (MySQL) - use exactly this schema

Put this in `backend/migrations/001_init.sql` and apply it automatically on startup if tables are missing (or document a one-line command). Money is always `DECIMAL(12,2)`; never use floats for money. A transaction's type (income/expense) is **derived from its category**, it is not stored on the transaction.

```sql
CREATE DATABASE finance_portal
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finance_portal;

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name     VARCHAR(100)    NOT NULL,
  email         VARCHAR(150)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  currency      CHAR(3)         NOT NULL DEFAULT 'INR',
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  name       VARCHAR(60)     NOT NULL,
  type       ENUM('income','expense') NOT NULL,
  color      CHAR(7)         NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_category (user_id, name, type),
  CONSTRAINT fk_cat_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE transactions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  category_id BIGINT UNSIGNED NOT NULL,
  amount      DECIMAL(12,2)   NOT NULL,
  description VARCHAR(255)    NULL,
  txn_date    DATE            NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_txn_user_date (user_id, txn_date),
  KEY idx_txn_category (category_id),
  CONSTRAINT chk_txn_amount CHECK (amount > 0),
  CONSTRAINT fk_txn_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_txn_cat FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE budgets (
  id           BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED  NOT NULL,
  category_id  BIGINT UNSIGNED  NOT NULL,
  `month`      TINYINT UNSIGNED NOT NULL,
  `year`       SMALLINT UNSIGNED NOT NULL,
  amount_limit DECIMAL(12,2)    NOT NULL,
  created_at   TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_budget (user_id, category_id, `year`, `month`),
  CONSTRAINT chk_budget_month CHECK (`month` BETWEEN 1 AND 12),
  CONSTRAINT chk_budget_limit CHECK (amount_limit > 0),
  CONSTRAINT fk_bud_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_bud_cat FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

On registration, create these **default categories** for the new user (inside one DB transaction with the user insert):
- Expense: Food & Dining, Transport, Rent / Housing, Utilities, Shopping, Health, Education, Entertainment, Other
- Income: Salary, Freelance, Other Income

Give each a distinct hex colour.

## 5. Back-end specification

**Config (env vars):** `PORT` (default 8080), `ENV` (development/production), `DB_DSN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN` (default http://localhost:5173). Refuse to start if secrets are empty in production.

**General rules**
- Base path `/api/v1`. JSON only. Errors always look like `{ "error": "message" }`.
- Status codes: 200, 201, 204, 400 (validation), 401, 404, 409 (duplicate email/category), 429, 500.
- Set `decimal.MarshalJSONWithoutQuotes = true` so amounts are JSON numbers.
- Money fields in JSON are numbers with 2 decimals. Dates are `YYYY-MM-DD` strings.
- **Every repository query must include `user_id = <authenticated user>`.** Accessing another user's record returns 404.
- Use only parameterised queries (GORM or `?` placeholders). Never concatenate user input into SQL.
- Layering: handler -> service -> repository. Handlers contain no business logic and no SQL.

**Auth**
- `POST /auth/register` `{fullName, email, password}`: password min 8 chars (at least one letter and one digit); email must be valid and unique (409 if taken); bcrypt cost 12; returns 201 `{id, fullName, email}`.
- `POST /auth/login` `{email, password}`: returns `{accessToken, user:{id,fullName,email,currency}}` and sets cookie `refresh_token` (HttpOnly, SameSite=Strict, Path=/api/v1/auth, Max-Age 7 days, Secure when ENV=production). Same generic error for unknown email and wrong password.
- Access token: JWT HS256, 15 minutes, claim `sub` = user id. Refresh token: JWT HS256, 7 days, separate secret.
- `POST /auth/refresh`: reads the cookie, returns a new `{accessToken}`.
- `POST /auth/logout`: clears the cookie (204).
- Rate-limit login and register: 5 requests/minute/IP, then 429.

**Users**
- `GET /users/me`, `PUT /users/me` (`fullName`, `currency` as 3-letter code), `PUT /users/me/password` (`currentPassword`, `newPassword`).

**Categories**
- `GET /categories?type=income|expense`, `POST /categories` `{name,type,color}`, `PUT /categories/:id`, `DELETE /categories/:id`.
- Unique per (user, name, type). Deleting a category used by transactions returns 409 with a clear message (FK is RESTRICT).

**Transactions**
- `GET /transactions?type&categoryId&from&to&q&page=1&limit=10&sort=date_desc` -> `{data:[...], page, limit, total}`. `q` searches description. Each item: `{id, categoryId, categoryName, categoryType, categoryColor, amount, description, txnDate}`.
- `POST /transactions` `{categoryId, amount, description, txnDate}` (amount > 0, date valid, category must belong to the user) -> 201.
- `GET /transactions/:id`, `PUT /transactions/:id`, `DELETE /transactions/:id` (204).
- `GET /transactions/export?...same filters...` -> `text/csv` download (columns: Date, Type, Category, Description, Amount).

**Budgets**
- `GET /budgets?month=&year=`, `POST /budgets` `{categoryId, month, year, amountLimit}` (expense categories only; 409 if one already exists for that month), `PUT /budgets/:id`, `DELETE /budgets/:id`.

**Reports** (calculate in SQL with SUM / GROUP BY / JOIN, not in loops)
- `GET /reports/summary?month=&year=` -> `{month, year, totalIncome, totalExpense, balance, savingsRate}`
- `GET /reports/category-breakdown?from=&to=&type=expense` -> `[{categoryId, name, color, total, percent}]`
- `GET /reports/monthly-trend?months=6` -> `[{year, month, label, income, expense, balance}]` (include months with zero data)
- `GET /reports/budget-vs-actual?month=&year=` -> `[{budgetId, categoryId, categoryName, color, limit, spent, remaining, utilisationPercent, status}]`

**Formulas**
- balance = income - expense
- savingsRate % = (income - expense) / income x 100 (0 if income is 0)
- category percent = category total / total x 100
- utilisation % = spent / limit x 100
- status: `<75` -> `on_track`, `75 to <100` -> `warning`, `>=100` -> `exceeded`

**Middleware:** request logger (never log passwords/tokens), CORS limited to `CORS_ORIGIN` with credentials, security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), JWT auth for all protected routes (sets `userID` in context). Graceful shutdown.

## 6. Front-end specification

**Auth flow:** keep the access token **in memory** (not localStorage). On app load, silently call `/auth/refresh` to restore the session. Axios request interceptor adds `Authorization: Bearer <token>`; response interceptor refreshes once on 401 and retries, otherwise redirects to `/login`. Provide `AuthContext` and a `ProtectedRoute`. Vite dev server proxies `/api` to `http://localhost:8080`.

**Routes / pages** (exact names)
- `/register` Register, `/login` Login
- `/` Dashboard
- `/transactions` Transactions (table + filters + add/edit modal + delete confirm + CSV export button)
- `/categories` Categories
- `/budgets` Budgets
- `/reports` Reports
- `/profile` Profile / Settings (update profile, currency, change password, logout)
- `*` Not Found

**Dashboard:** month selector; 4 summary cards (Total Income, Total Expense, Net Balance, Savings Rate); expense-by-category **pie chart**; monthly income vs expense **bar chart** (last 6 months); balance-trend **line chart**; budget alerts for categories in `warning`/`exceeded`; last 5 transactions.

**Transactions:** search box, filters (type, category, from/to dates), pagination, sortable by date/amount, add/edit modal, delete with confirmation, CSV export of the current filter.

**Budgets:** month/year picker; one row per budget with a **progress bar** coloured green (<75%), amber (75-99%), red (>=100%), showing spent / limit / remaining; add/edit/delete.

**Reports:** date-range picker; category breakdown (pie + table with %), monthly trend chart, budget vs actual table; export button.

**UX rules:** Tailwind, fully responsive (sidebar on desktop, hamburger on mobile); loading skeletons, empty states with a friendly message, toast notifications for success/error; form validation with `zod` and inline messages; currency formatted with `Intl.NumberFormat` using the user's currency (default INR, locale en-IN); green = income, red = expense, amber = warning; accessible labels and keyboard-friendly modals. TypeScript strict, no `any`; shared API types in `src/types`.

## 7. Security checklist (must all be true)

1. Passwords stored only as bcrypt (cost 12) hashes, never returned or logged.
2. Short-lived access token in memory; refresh token only in an HttpOnly, SameSite=Strict cookie.
3. Every query scoped by the authenticated user's id; ownership of related records (e.g. category on a new transaction) is verified.
4. Parameterised queries only; request validation on every endpoint.
5. CORS restricted; rate limiting on login/register; security headers set.
6. No secrets in the repo; `.env.example` only.
7. React never uses `dangerouslySetInnerHTML`.

## 8. Tests (name them so they map to my report)

**Go unit tests**
- UT01 password hash/verify; UT02 JWT create/validate (valid, expired, tampered); UT03 auth middleware (none/bad/valid token); UT04 amount validation; UT05 date validation; UT06 savings rate (50000 income, 20000 expense -> 60%; income 0 -> 0); UT07 budget status at 50%, 80%, 100%; UT08 category percent sums to 100 (within rounding); UT09 email validation.

**Go integration tests** (use `httptest` against a real MySQL test database configured by `TEST_DB_DSN`; create/clean schema per run)
- IT01 register then login; IT02 duplicate email -> 409; IT03 create transaction then list; IT04 update and delete; IT05 filters + pagination; IT06 user B cannot read user A's transaction (404); IT07 delete category in use -> 409; IT08 budget vs actual; IT09 summary equals manual sum; IT12 CSV export matches filter.

**Front-end (Vitest)**
- UT10 currency/date formatting helpers; plus component tests for the login form validation and the budget progress-bar colour logic.

Provide `go test ./...` and `npm test` commands in the README and make sure both pass.

## 9. Demo data seeder (important for my report screenshots)

Create `cmd/seed/main.go` that creates a demo user (`demo@example.com` / `Demo@1234`) and inserts **about 3 months of realistic data ending in the current month**: monthly salary, a freelance payment, rent, groceries/food, transport, utilities, shopping, entertainment and health expenses (roughly 60-90 transactions), plus budgets for 5 expense categories where at least one is below 75%, one is between 75-99% and one is over 100%, so every chart and status colour is visible. Make it idempotent (safe to re-run).

## 10. Deliverables and working method

Work in this order and verify each phase before the next:
1. Repo skeleton, docker-compose (MySQL), config, DB connection and migration.
2. Models, repositories, auth (register/login/refresh/logout) + middleware + tests.
3. Categories, transactions (incl. filters, pagination, CSV), budgets.
4. Report endpoints + tests.
5. Seeder.
6. Front end: setup, auth flow, layout, then each page in the order Login/Register, Dashboard, Transactions, Categories, Budgets, Reports, Profile.
7. Responsive polish, error/empty/loading states.
8. README: prerequisites, setup, env vars, run commands, test commands, demo login, API endpoint table, and a short architecture section.

**Definition of done:** `docker compose up -d` starts MySQL; backend and frontend start with documented commands; I can register, log in, add/edit/delete transactions, categories and budgets, see all three chart types and budget statuses with the demo data, export CSV, and log out; all tests pass; no TypeScript, `go vet` or ESLint errors. At the end, print the exact commands to run everything.
