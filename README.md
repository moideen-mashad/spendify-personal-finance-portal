# Personal Finance Management Portal (Spendify)

A full-stack, enterprise-grade personal wealth and budgeting portal developed as an MCA final-year capstone project. Designed with a strict focus on privacy, high performance, and zero vendor data lock-in.

- **Backend:** Go (Golang) 1.22+, Gin Web Framework, GORM ORM, Excelize v2.11+
- **Frontend:** React 18, TypeScript 5.5, Vite 5.4, Tailwind CSS, TanStack Table v8, Recharts, Lucide Icons
- **Database:** MySQL 8.0 InnoDB (9 Relational Tables, 3NF Normalized Schema)

---

## Key Enterprise Modules & Features

### 1. Excel / CSV Import, Export & Template Engine (`excelize`)
- **Downloadable Pre-Formatted Template:** Stream pre-styled Excel template (`finance_import_template.xlsx`) with column headers, data formats, and sample rows via `GET /transactions/template`.
- **Drag-and-Drop Batch Import Wizard:** Upload `.xlsx` or `.csv` files with client & server-side validation, row-level error reporting, automatic category auto-resolution, and atomic database transaction insertion (`POST /transactions/import`).
- **Multi-Format Financial Statements:** Export filtered transactions, monthly budget vs. actuals, and executive financial KPI summaries into multi-sheet styled `.xlsx` workbooks or lightweight `.csv` files (`GET /transactions/export?format=xlsx|csv`).

### 2. Taxonomy & Category Icon Engine
- Full CRUD for income and expense categories (`/categories`).
- **Icon Selector:** 16 curated Lucide icons (Utensils, ShoppingBag, Car, Home, Zap, Heart, GraduationCap, Plane, Film, Music, Dumbbell, Coffee, Briefcase, TrendingUp, Gift, Landmark).
- **Color Palette:** 12 fintech-tuned hex swatches with automatic light/dark contrast adjustments.

### 3. Smart Budgeting & Proactive Alerts
- Set category-specific monthly spending limits (`/budgets`).
- Proactive **80% amber warning threshold** and **100% rose overspend alert**.
- Real-time progress bars comparing actual transaction sums to allocated limits.

### 4. Savings Goals & Milestone Tracker
- Dedicated savings funds (e.g. Emergency Reserve, Travel, Tech Gadgets) with target amounts and completion deadlines (`/goals`).
- Real-time funding percentage bars and incremental contribution logging with automatic status transitions (`active` → `completed`).

### 5. Automated Recurring Transactions & Bill Scheduler
- Automated recurring schedules (daily, weekly, monthly, yearly) for fixed expenses (rent, utility bills, subscriptions) and regular income (`/recurring`).
- Next-due-date badges and one-click manual execution (`POST /recurring/:id/run`) to immediately post entries to the ledger.

### 6. User Profile, Financial Preferences & Security Settings
- **Profile Tab:** Edit full name, contact phone, biographical note, avatar initials, and monthly baseline income goal (`/profile`).
- **Financial Settings Tab:** Choose display currency (INR ₹, USD $, EUR €, AED د.إ, GBP £), configure fiscal month start day (1–28), and adjust budget alert thresholds.
- **Security & Password Tab:** Secure self-service password update verifying current password via bcrypt, enforcing strong password rules (8+ chars, letter, digit, special character), real-time password strength meter (`Weak`, `Medium`, `Strong`), and recent session audit logging (IP address, user agent, timestamp).

### 7. Pro DataTable with Faceted Filtering
- URL query-synced filtering: transaction type (All, Income, Expense), multi-category selection, min/max amount range, and date range bounding.
- Multi-column sorting (`Date`, `Amount`, `Description`, `Category`).
- 300ms debounced instant search with keyboard shortcut trigger (`/` or `⌘K`).
- Batch bulk operations: bulk delete, bulk recategorize, and filtered CSV export.

---

## Database Architecture (9 Tables)

The MySQL relational database schema adheres to Third Normal Form (3NF):

1. `users` — Authentication credentials (bcrypt), profile data, currency preference, monthly income goal, fiscal cycle start day, alert thresholds.
2. `accounts` — Bank accounts, credit cards, cash wallets, UPI digital wallets with balance tracking.
3. `categories` — User-scoped category taxonomy with assigned Lucide icon and color swatch.
4. `transactions` — Core financial ledger with amounts, descriptions, merchants, notes, tags, dates, and import batch links.
5. `budgets` — Category spending caps per month and year with alert threshold percentages.
6. `recurring_transactions` — Scheduled bill rules and reminders with frequency cycles and next run dates.
7. `savings_goals` — Savings target funds with goal amounts, accumulated savings, and milestone deadlines.
8. `import_logs` — Audit log of bulk Excel/CSV file migrations, scanned rows, imported rows, and failure counts.
9. `audit_logs` — Immutable security event history (logins, password changes, data exports).

---

## API Specification

| Area | HTTP Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | POST | `/api/v1/auth/register` | Register new user and seed default categories |
| | POST | `/api/v1/auth/login` | Authenticate user, return JWT, set HttpOnly refresh cookie |
| | POST | `/api/v1/auth/refresh` | Mint new 15-minute access token from cookie |
| | POST | `/api/v1/auth/logout` | Clear refresh cookie |
| **Profile** | GET, PUT | `/api/v1/users/me` | Fetch or update user profile & financial preferences |
| | POST | `/api/v1/users/me/password` | Change password with bcrypt verification |
| | GET | `/api/v1/audit-logs` | Retrieve last 50 login/action audit logs |
| **Categories** | GET, POST | `/api/v1/categories` | List or create categories with icon & color |
| | PUT, DELETE | `/api/v1/categories/:id` | Update or delete category |
| **Transactions** | GET, POST | `/api/v1/transactions` | Paginated search, sort, filter, or create transaction |
| | PUT, DELETE | `/api/v1/transactions/:id` | Update or delete transaction |
| | GET | `/api/v1/transactions/template`| Download Excel import template (`.xlsx`) |
| | POST | `/api/v1/transactions/import` | Batch Excel/CSV upload with row validation |
| | GET | `/api/v1/transactions/export` | Multi-sheet Excel statement or CSV export |
| **Accounts** | GET, POST | `/api/v1/accounts` | List or create financial accounts/wallets |
| | PUT, DELETE | `/api/v1/accounts/:id` | Update or archive account |
| **Recurring** | GET, POST | `/api/v1/recurring` | List or create recurring bill schedules |
| | PUT, DELETE | `/api/v1/recurring/:id` | Update or delete schedule |
| | POST | `/api/v1/recurring/:id/run` | Execute schedule and post transaction |
| **Goals** | GET, POST | `/api/v1/goals` | List or create savings goals |
| | PUT, DELETE | `/api/v1/goals/:id` | Update or delete savings goal |
| | POST | `/api/v1/goals/:id/contribute` | Add contribution towards goal |
| **Budgets** | GET, POST | `/api/v1/budgets` | List or create monthly category budget |
| | PUT, DELETE | `/api/v1/budgets/:id` | Update or delete budget |
| **Reports** | GET | `/api/v1/reports/summary` | Monthly total income, expense, balance, savings rate |
| | GET | `/api/v1/reports/category-breakdown` | Category spending distributions |
| | GET | `/api/v1/reports/monthly-trend` | 6-month comparative cash-flow trend |
| | GET | `/api/v1/reports/budget-vs-actual` | Category limit vs. spent utilisation report |

---

## Getting Started

### Prerequisites
- **Docker Desktop** (for MySQL 8.0)
- **Go 1.22+**
- **Node.js 20+** and npm

### 1. Start MySQL Database
```powershell
docker compose up -d
```

### 2. Run Database Migrations & Start Backend API
```powershell
Set-Location backend
Copy-Item .env.example .env
go mod tidy
go run ./cmd/server
```
The REST API starts at `http://localhost:8080`.

### 3. Start Frontend Client (New Terminal)
```powershell
Set-Location frontend
Copy-Item .env.example .env
npm install
npm run dev
```
Open `http://localhost:5173`.

### 4. Seed Demo Data (Optional)
```powershell
Set-Location backend
go run ./cmd/seed
```
Demo Credentials:
- **Email:** `demo@example.com`
- **Password:** `Demo@1234`

---

## Verification & Testing

```powershell
# Backend Verification
Set-Location backend
gofmt -w .
go vet ./...
go test ./...

# Frontend Verification
Set-Location ../frontend
npm run build
npm test
```

---

## Project Documentation

- Free-tier self-hosted deployment guide: [`DEPLOYMENT_FREE.md`](./DEPLOYMENT_FREE.md)
- Academic Project Report (Markdown): [`MCA_Project_Report_v2.md`](file:///c:/Users/Moideen%20Mashad/My%20media%20files/DEVELOPMENT/MCA-FINAL-YEAR-PROJECT/MCA_Project_Report_v2.md)
- Academic Project Report (Microsoft Word): [`Personal_Finance_Portal_MCA_Project_Report.docx`](file:///c:/Users/Moideen%20Mashad/My%20media%20files/DEVELOPMENT/MCA-FINAL-YEAR-PROJECT/Personal_Finance_Portal_MCA_Project_Report.docx)
