# DESIGN AND DEVELOPMENT OF A WEB-BASED PERSONAL FINANCE MANAGEMENT PORTAL FOR BUDGETING, EXPENSE TRACKING, AND FINANCIAL REPORTING

**A Master of Computer Applications (MCA) Final Year Capstone Project Report**

---

## PROJECT METADATA

- **Project Title:** Design and Development of a Web-Based Personal Finance Management Portal for Budgeting, Expense Tracking, and Financial Reporting
- **Candidate Name:** Moideen Mashad
- **Degree:** Master of Computer Applications (MCA)
- **Academic Year:** 2026–2027
- **Primary Tech Stack:**
  - **Backend:** Go (Golang) 1.26.0, Gin Web Framework, GORM ORM, Excelize v2.11+, golang-jwt/v5, bcrypt
  - **Database:** MySQL 8.0 InnoDB with nine application models
  - **Frontend:** React 18, TypeScript 5.5, Vite 5.4, Tailwind CSS, Lucide Icons, TanStack Table v8, Recharts, React Hook Form, Zod

---

## ABSTRACT

In modern personal wealth management, individual consumers face significant challenges in tracking fragmented expenditures across digital banking portals, credit cards, cash wallets, and automated subscription billing. Existing commercial solutions frequently suffer from proprietary data lock-in, aggressive monetization, invasive financial data scraping, and lack of bulk data portability.

This project presents the design and implementation of **Spendify**, a self-hostable, web-based Personal Finance Management Portal. The portal enables end users to track discretionary and fixed expenses, categorize income and expenditure streams, define category-wise monthly spending budgets with utilization indicators, define recurring schedules for manual posting, and track cumulative savings goals.

The Excel/CSV engine uses Excelize for template downloads, batch import with row-level error reporting, and two-sheet XLSX statements. The current code also includes profile editing, password changes, savings goals and manual recurring posting. Account APIs exist, but their page remains a placeholder. Access tokens last 15 minutes, refresh cookies last seven days, and password hashes use bcrypt cost 12. Audit records are best-effort event records rather than immutable logs. No latency or load benchmark is established. The implementation review dated 18 November 2026 separates completed features, partial workflows and remaining work.

---

## TABLE OF CONTENTS

- [CHAPTER 1: INTRODUCTION](#chapter-1-introduction)
  - [1.1 Background & Motivation](#11-background--motivation)
  - [1.2 Objectives](#12-objectives)
  - [1.3 Scope of the Project](#13-scope-of-the-project)
  - [1.4 Implemented Portal and Current Boundaries](#14-implemented-portal-and-current-boundaries)
- [CHAPTER 2: SYSTEM REQUIREMENTS & LITERATURE REVIEW](#chapter-2-system-requirements--literature-review)
  - [2.1 Literature Review and Technical Context](#21-literature-review-and-technical-context)
  - [2.2 Implementation Gaps Addressed](#22-implementation-gaps-addressed)
  - [2.3 Functional Requirements](#23-functional-requirements)
  - [2.4 Non Functional Requirements](#24-non-functional-requirements)
  - [2.5 Technology Stack Justification](#25-technology-stack-justification)
- [CHAPTER 3: SYSTEM ARCHITECTURE & DATABASE DESIGN](#chapter-3-system-architecture--database-design)
  - [3.1 Architectural Overview](#31-architectural-overview)
  - [3.2 Data Flow Architecture](#32-data-flow-architecture)
  - [3.3 Normalized Database Schema (9 Relational Tables)](#33-normalized-database-schema-9-relational-tables)
  - [3.4 Entity Relationships and Integrity](#34-entity-relationships-and-integrity)
- [CHAPTER 4: API & MODULE DESIGN](#chapter-4-api--module-design)
  - [4.1 RESTful API Endpoint Specification Table](#41-restful-api-endpoint-specification-table)
  - [4.2 Excel and CSV portability](#42-excel-and-csv-portability)
  - [4.3 Profile settings and password changes](#43-profile-settings-and-password-changes)
  - [4.4 Accounts and savings goals](#44-accounts-and-savings-goals)
  - [4.5 Recurring transaction workflow](#45-recurring-transaction-workflow)
  - [4.6 Interface controls and resilience](#46-interface-controls-and-resilience)
- [CHAPTER 5: IMPLEMENTATION & USER INTERFACE](#chapter-5-implementation--user-interface)
  - [5.1 Backend Implementation Details](#51-backend-implementation-details)
  - [5.2 Frontend Implementation Details](#52-frontend-implementation-details)
  - [5.3 UI/UX Design System](#53-uiux-design-system)
  - [5.4 Screen Coverage and Evidence](#54-screen-coverage-and-evidence)
- [CHAPTER 6: SYSTEM TESTING & SECURITY AUDIT](#chapter-6-system-testing--security-audit)
  - [6.1 Verification Method](#61-verification-method)
  - [6.2 Observed Frontend Results](#62-observed-frontend-results)
  - [6.3 Database and API Verification Still Required](#63-database-and-api-verification-still-required)
  - [6.4 Missing and Partial Implementation](#64-missing-and-partial-implementation)
- [CHAPTER 7: CONCLUSION & FUTURE WORK](#chapter-7-conclusion--future-work)
  - [7.1 Summary of Contributions](#71-summary-of-contributions)
  - [7.2 Remaining Work and Future Enhancements](#72-remaining-work-and-future-enhancements)
- [REFERENCES](#references)
- [APPENDICES](#appendices)
  - [Appendix A Database Sources and Migration Differences](#appendix-a-database-sources-and-migration-differences)
  - [Appendix B Implementation Source Map](#appendix-b-implementation-source-map)

---

## CHAPTER 1: INTRODUCTION

### 1.1 Background & Motivation

Personal financial literacy and proactive budgeting are foundational to long-term economic stability. However, the proliferation of digital payment channels—ranging from UPI and mobile wallets to credit cards and net banking—has made day-to-day expenditure tracking increasingly fragmented. Individuals frequently struggle to maintain a coherent view of their cash flow, resulting in unmonitored subscription creep, impulse purchasing, and missed savings targets.

Commercial finance applications frequently fail to solve this problem effectively. Many enforce closed ecosystems where user data cannot be exported in open, multi-sheet spreadsheet formats. Others sell user transaction metadata to third-party advertisers or require mandatory, intrusive integration with banking credentials via unverified scraping intermediaries.

The motivation of this project is to develop **Spendify**, a modern, open-standard, secure, and privacy-respecting Personal Finance Portal designed from the ground up for individual sovereignty, zero vendor lock-in, and full financial transparency.

### 1.2 Objectives

The primary objectives of the capstone project are:

1. **Full-Stack Financial Ledger:** Implement an income/expense ledger with merchant, notes and tags fields. Transfer and double-entry accounting are not implemented.
2. **Data Portability & Spreadsheet Engine:** Develop a bi-directional Excel/CSV engine utilizing Golang and `excelize` to allow instant template generation, batch drag-and-drop file imports with row-level validation, and multi-sheet `.xlsx` financial statement exports.
3. **Multi-Account & Wallet Orchestration:** Allow users to manage multiple accounts (Bank Accounts, Credit Cards, Cash Wallets, UPI accounts) with manually stored balances and an archive endpoint; account-level ledger reconciliation remains future work.
4. **Intelligent Budgeting & Warning Thresholds:** Provide category-specific monthly spending limits with frontend warnings at 80% and overruns at 100%; reconcile these with the backend's 75% warning threshold.
5. **Milestone Savings Goals:** Allow tracking of dedicated financial goals (emergency fund, vehicle purchase, travel) with progress percentages and cumulative contributions; a contribution-history table is not implemented.
6. **Recurring Bill Scheduling:** Manage recurring schedules and manual Post Now actions. Timed execution and notification delivery remain future work.
7. **Enterprise Security & Account Controls:** Implement secure authentication with bcrypt password hashing (cost factor 12), JWT-based stateless sessions, HttpOnly SameSite refresh cookies, self-service password changes, and audit logging.

### 1.3 Scope of the Project

The project encompasses:

- A responsive, high-performance web interface built with React 18, TypeScript, and Tailwind CSS.
- A concurrent, memory-safe backend API written in Go using the Gin framework and GORM.
- A normalized relational MySQL database adhering to Third Normal Form (3NF).
- Template-based imports and export portability via industry-standard `.xlsx` and `.csv` formats.
- Deployment support via Docker Compose for seamless reproducible development and production environments.

### 1.4 Implemented Portal and Current Boundaries

The project provides a self-hostable ledger and structured import/export workflows. The present implementation does not connect to banks, execute payments or record transfers. Stored accounts are separate from transactions, and recurring entries require a manual action. These boundaries distinguish implemented application behavior from proposed enhancements; no comparative performance claims are made.

---

## CHAPTER 2: SYSTEM REQUIREMENTS & LITERATURE REVIEW

### 2.1 Literature Review and Technical Context

The bibliography provides background in software architecture, relational data modeling, web interfaces, passwords and token authentication. It does not establish performance results for this implementation. The current architecture is evaluated against the source code and test results documented in Chapter 6.

### 2.2 Implementation Gaps Addressed

The portal reduces repetitive entry using an import template and row-level errors, groups transactions through user-owned categories, and combines reports with budgeting. Short-lived JWTs and HttpOnly refresh cookies support authentication, while rotation, revocation and online rate limiting remain outstanding.

### 2.3 Functional Requirements

- **FR-1 [Authentication & Access Control]:** User registration, login, token refresh, and logout with bcrypt password verification.
- **FR-2 [User Profile & Preferences]:** Update name, phone, bio, preferred currency (INR, USD, EUR, AED, GBP), fiscal start day, and alert thresholds.
- **FR-3 [Security & Password Management]:** Change password with current password verification, letter, digit, special-character and length checks, and audit logging.
- **FR-4 [Accounts Management]:** Backend create/read/update/archive operations for bank accounts, credit cards, cash, UPI and digital wallets; frontend integration remains incomplete.
- **FR-5 [Categories & Icon Engine]:** Category CRUD with Lucide icon choices and a curated color palette.
- **FR-6 [Transaction Management]:** Record income and expense entries with amount, date, description, merchant, notes, and tags.
- **FR-7 [Advanced DataTable & Filtering]:** Multi-column sorting, debounced keyword search, category filtering, and amount/date range bounding.
- **FR-8 [Excel/CSV Import Wizard]:** Drag-and-drop file upload, format validation, row-level error reporting, and transactional batch insertion.
- **FR-9 [Template Engine & Multi-Format Export]:** Download pre-formatted `.xlsx` template; export ledger as multi-sheet `.xlsx` workbook or `.csv`.
- **FR-10 [Smart Budgeting & Alerts]:** Set monthly category limits; frontend indicators warn at 80% and mark exceeded at 100%. Backend warning status currently starts at 75%, and stored custom thresholds are not applied.
- **FR-11 [Savings Goals Tracker]:** Create savings targets, record contributions, and display completion progress.
- **FR-12 [Recurring Transactions Scheduler]:** Define recurring schedules (daily, weekly, monthly, yearly) and execute manual triggers.
- **FR-13 [Financial Analytics & KPI Reporting]:** Net balance, savings rate, cash flow trends, category breakdown, and budget-vs-actual summaries.

### 2.4 Non Functional Requirements

Usability goals include responsive layouts, keyboard-operable controls, readable financial columns, clear validation, loading skeletons and retry states. Reliability goals include protected record ownership, atomic operations where implemented, and explicit handling of partial import failures. Performance targets require a reproducible benchmark; no sub-15 ms latency, sub-second load or large-ledger scalability result is claimed. Security requires production secrets, HTTPS deployment, validation, rate limiting and session lifecycle controls, some of which remain gaps.

### 2.5 Technology Stack Justification

```
+--------------------------------------------------------------------------+
|                            FRONTEND TIER                                 |
|  React 18 + TypeScript 5.5 + Vite 5.4 + Tailwind CSS + TanStack Table    |
+--------------------------------------------------------------------------+
                                    |
                            HTTP/REST (JSON)
                            Multipart Form-Data
                                    |
+--------------------------------------------------------------------------+
|                             API GATEWAY                                  |
|     Go 1.26 Gin Framework  + JWT Middleware + CORS Security Headers      |
+--------------------------------------------------------------------------+
                                    |
                    +---------------+---------------+
                    |                               |
+-----------------------------------+   +----------------------------------+
|          BUSINESS LOGIC           |   |       DATA PORTABILITY           |
| Gin Handlers + GORM ORM           |   |  Excelize v2.11 (.xlsx Engine)   |
+-----------------------------------+   +----------------------------------+
                    |                               |
                    +---------------+---------------+
                                    |
                           SQL / Connection Pool
                                    |
+--------------------------------------------------------------------------+
|                            DATABASE TIER                                 |
|                 MySQL 8.0 InnoDB Relational Database                     |
|           (Users, Accounts, Categories, Transactions, Budgets,           |
|            Recurring, Savings Goals, Import Logs, Audit Logs)            |
+--------------------------------------------------------------------------+
```

- **Go (Golang):** Provides a compiled backend, static types and a standard HTTP and concurrency library.
- **Excelize v2:** The Go dependency used for reading and writing Microsoft Excel (`.xlsx`) files without requiring COM automation or external runtimes.
- **React & TypeScript:** Static types help maintain component interfaces, while TanStack Table provides sorting and multi-filtering; row virtualization is not implemented.
- **MySQL 8.0 InnoDB:** Provides foreign key cascades, transactional ACID guarantees, check constraints, and high-performance B-tree indexing.

---

## CHAPTER 3: SYSTEM ARCHITECTURE & DATABASE DESIGN

### 3.1 Architectural Overview

Spendify employs a decoupled **Three-Tier Architecture** comprising the Presentation Tier, the Application Tier, and the Data Tier. The frontend client operates as a Single Page Application (SPA) communicating through JSON REST endpoints. Protected routes require authentication; HTTPS depends on deployment configuration.

### 3.2 Data Flow Architecture

The React client sends JSON or multipart requests through the shared Axios client. JWT middleware authenticates protected routes. Gin handlers validate input and use GORM directly; there is no repository package. Shared service functions calculate savings rate and budget status. Registration, import-log/transaction insertion and recurring posting use database transactions; category creation during import occurs before the import transaction. Event logging is best effort. The frontend reloads relevant data after successful writes.

### 3.3 Normalized Database Schema (9 Relational Tables)

The application declares nine GORM models. The tables below describe the intended SQL design. Startup uses GORM AutoMigrate rather than running the SQL files; current model tags do not reproduce every precision, constraint and index in those files. A live database schema comparison is required before asserting deployed DDL parity.

#### 1. `users` Table

Stores authentication credentials, profile data, localization settings, and budget warning preferences.

| Column                | Data Type        | Constraints / Default       | Description                         |
| --------------------- | ---------------- | --------------------------- | ----------------------------------- |
| `id`                  | BIGINT UNSIGNED  | AUTO_INCREMENT, PRIMARY KEY | Unique user identifier              |
| `full_name`           | VARCHAR(100)     | NOT NULL                    | User's full name                    |
| `email`               | VARCHAR(150)     | NOT NULL, UNIQUE INDEX      | Primary login email                 |
| `password_hash`       | VARCHAR(255)     | NOT NULL                    | Bcrypt hash (cost 12)               |
| `currency`            | CHAR(3)          | NOT NULL, DEFAULT 'INR'     | ISO currency code (INR, USD, etc.)  |
| `phone`               | VARCHAR(20)      | NULL                        | Contact phone number                |
| `avatar_url`          | VARCHAR(500)     | NULL                        | URL / path to user profile image    |
| `bio`                 | VARCHAR(500)     | NULL                        | Brief user biography                |
| `monthly_income_goal` | DECIMAL(14,2)    | NULL in migration 002       | Monthly target income baseline      |
| `fiscal_start_day`    | TINYINT UNSIGNED | DEFAULT 1, CHECK (1..28)    | Start day of fiscal tracking cycle  |
| `alert_threshold_pct` | TINYINT UNSIGNED | DEFAULT 80, CHECK (1..100)  | Budget warning threshold percentage |
| `created_at`          | TIMESTAMP        | DEFAULT CURRENT_TIMESTAMP   | Account creation timestamp          |
| `updated_at`          | TIMESTAMP        | AUTO UPDATE ON UPDATE       | Last profile update timestamp       |

#### 2. `accounts` Table

Tracks distinct financial wallets, banks, and payment channels.

| Column         | Data Type       | Constraints / Default                                         | Description                                               |
| -------------- | --------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `id`           | BIGINT UNSIGNED | AUTO_INCREMENT, PRIMARY KEY                                   | Account identifier                                        |
| `user_id`      | BIGINT UNSIGNED | NOT NULL, FK → `users(id)` ON DELETE CASCADE                  | Owning user reference                                     |
| `name`         | VARCHAR(100)    | NOT NULL                                                      | Account name (e.g., HDFC Bank, Cash)                      |
| `account_type` | ENUM            | NOT NULL ('bank','credit_card','cash','upi','digital_wallet') | Type of financial account                                 |
| `balance`      | DECIMAL(14,2)   | NOT NULL, DEFAULT 0.00                                        | Manually stored balance; not reconciled with transactions |
| `currency`     | CHAR(3)         | NOT NULL, DEFAULT 'INR'                                       | Account currency                                          |
| `is_archived`  | BOOLEAN         | NOT NULL, DEFAULT FALSE                                       | Soft-delete / archival flag                               |
| `created_at`   | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP                                     | Creation timestamp                                        |
| `updated_at`   | TIMESTAMP       | AUTO UPDATE ON UPDATE                                         | Last update timestamp                                     |

#### 3. `categories` Table

User-scoped taxonomy for transaction tagging, visual badges, and budget grouping.

| Column       | Data Type                | Constraints / Default                        | Description                       |
| ------------ | ------------------------ | -------------------------------------------- | --------------------------------- |
| `id`         | BIGINT UNSIGNED          | AUTO_INCREMENT, PRIMARY KEY                  | Category identifier               |
| `user_id`    | BIGINT UNSIGNED          | NOT NULL, FK → `users(id)` ON DELETE CASCADE | Owning user reference             |
| `name`       | VARCHAR(60)              | NOT NULL                                     | Label (e.g., Food & Dining, Rent) |
| `type`       | ENUM('income','expense') | NOT NULL                                     | Cash-flow classification          |
| `color`      | CHAR(7)                  | NOT NULL, DEFAULT '#6366F1'                  | Hex color code for UI rendering   |
| `icon`       | VARCHAR(50)              | NOT NULL, DEFAULT 'circle'                   | Lucide icon identifier            |
| `is_default` | BOOLEAN                  | NOT NULL, DEFAULT FALSE                      | System-seeded category indicator  |
| `created_at` | TIMESTAMP                | DEFAULT CURRENT_TIMESTAMP                    | Creation timestamp                |

_Unique Key:_ `uq_category (user_id, name, type)`

#### 4. `transactions` Table

Core transactional ledger recording individual financial events.

| Column            | Data Type       | Constraints / Default                              | Description                   |
| ----------------- | --------------- | -------------------------------------------------- | ----------------------------- |
| `id`              | BIGINT UNSIGNED | AUTO_INCREMENT, PRIMARY KEY                        | Transaction identifier        |
| `user_id`         | BIGINT UNSIGNED | NOT NULL, FK → `users(id)` ON DELETE CASCADE       | Owning user reference         |
| `category_id`     | BIGINT UNSIGNED | NOT NULL, FK → `categories(id)` ON DELETE RESTRICT | Assigned category             |
| `amount`          | DECIMAL(12,2)   | NOT NULL, CHECK (`amount` > 0)                     | Monetary value                |
| `description`     | VARCHAR(255)    | NULL in migration 001                              | Narrative explanation         |
| `merchant`        | VARCHAR(150)    | NULL                                               | Merchant / counterparty name  |
| `notes`           | TEXT            | NULL                                               | Additional user notes         |
| `tags`            | VARCHAR(500)    | NULL                                               | Comma-delimited tags          |
| `txn_date`        | DATE            | NOT NULL                                           | Transaction date              |
| `import_batch_id` | BIGINT UNSIGNED | NULL, FK → `import_logs(id)`                       | Batch import audit link       |
| `created_at`      | TIMESTAMP       | DEFAULT CURRENT_TIMESTAMP                          | Record creation timestamp     |
| `updated_at`      | TIMESTAMP       | AUTO UPDATE ON UPDATE                              | Record modification timestamp |

_Indexes:_ `idx_txn_user_date (user_id, txn_date)`, `idx_txn_cat (category_id)`

#### 5. `budgets` Table

Monthly spending ceilings per expense category.

| Column                | Data Type         | Constraints / Default                             | Description                    |
| --------------------- | ----------------- | ------------------------------------------------- | ------------------------------ |
| `id`                  | BIGINT UNSIGNED   | AUTO_INCREMENT, PRIMARY KEY                       | Budget identifier              |
| `user_id`             | BIGINT UNSIGNED   | NOT NULL, FK → `users(id)` ON DELETE CASCADE      | Owning user reference          |
| `category_id`         | BIGINT UNSIGNED   | NOT NULL, FK → `categories(id)` ON DELETE CASCADE | Expense category linked        |
| `month`               | TINYINT UNSIGNED  | NOT NULL, CHECK (`month` BETWEEN 1 AND 12)        | Target calendar month          |
| `year`                | SMALLINT UNSIGNED | NOT NULL                                          | Target calendar year           |
| `amount_limit`        | DECIMAL(12,2)     | NOT NULL, CHECK (`amount_limit` > 0)              | Spending cap                   |
| `alert_threshold_pct` | TINYINT UNSIGNED  | NOT NULL, DEFAULT 80                              | Custom alert percentage        |
| `rollover_enabled`    | BOOLEAN           | NOT NULL, DEFAULT FALSE                           | Surplus/deficit carryover flag |
| `created_at`          | TIMESTAMP         | DEFAULT CURRENT_TIMESTAMP                         | Creation timestamp             |

_Unique Key:_ `uq_budget (user_id, category_id, year, month)`

#### 6. `recurring_transactions` Table

Recurring schedule definitions with manual execution and duplicate-posting protection.

| Column          | Data Type                                 | Constraints / Default                              | Description                                           |
| --------------- | ----------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `id`            | BIGINT UNSIGNED                           | AUTO_INCREMENT, PRIMARY KEY                        | Schedule identifier                                   |
| `user_id`       | BIGINT UNSIGNED                           | NOT NULL, FK → `users(id)` ON DELETE CASCADE       | Owning user reference                                 |
| `category_id`   | BIGINT UNSIGNED                           | NOT NULL, FK → `categories(id)` ON DELETE RESTRICT | Transaction category                                  |
| `title`         | VARCHAR(150)                              | NOT NULL                                           | Schedule name (e.g. WiFi Bill)                        |
| `txn_type`      | ENUM('income','expense')                  | NOT NULL                                           | Flow type                                             |
| `amount`        | DECIMAL(12,2)                             | NOT NULL, CHECK (`amount` > 0)                     | Scheduled amount                                      |
| `frequency`     | ENUM('daily','weekly','monthly','yearly') | NOT NULL                                           | Recurrence cycle                                      |
| `next_run_date` | DATE                                      | NOT NULL                                           | Next scheduled execution date                         |
| `last_run_at`   | Nullable datetime via GORM                | Missing from migration 002                         | Latest posting timestamp used by duplicate prevention |
| `is_active`     | BOOLEAN                                   | NOT NULL, DEFAULT TRUE                             | Pause / active state toggle                           |
| `created_at`    | TIMESTAMP                                 | DEFAULT CURRENT_TIMESTAMP                          | Creation timestamp                                    |

#### 7. `savings_goals` Table

Target-based savings funds and milestone trackers.

| Column           | Data Type                           | Constraints / Default                        | Description                      |
| ---------------- | ----------------------------------- | -------------------------------------------- | -------------------------------- |
| `id`             | BIGINT UNSIGNED                     | AUTO_INCREMENT, PRIMARY KEY                  | Goal identifier                  |
| `user_id`        | BIGINT UNSIGNED                     | NOT NULL, FK → `users(id)` ON DELETE CASCADE | Owning user reference            |
| `title`          | VARCHAR(150)                        | NOT NULL                                     | Goal title (e.g. Emergency Fund) |
| `target_amount`  | DECIMAL(14,2)                       | NOT NULL, CHECK (`target_amount` > 0)        | Target fund goal                 |
| `current_amount` | DECIMAL(14,2)                       | NOT NULL, DEFAULT 0.00                       | Accumulated savings              |
| `deadline`       | DATE                                | NULL                                         | Target completion date           |
| `icon`           | VARCHAR(50)                         | NOT NULL, DEFAULT 'target'                   | Assigned icon                    |
| `color`          | CHAR(7)                             | NOT NULL, DEFAULT '#6366F1'                  | Accent color                     |
| `status`         | ENUM('active','completed','paused') | NOT NULL, DEFAULT 'active'                   | Milestone lifecycle status       |
| `created_at`     | TIMESTAMP                           | DEFAULT CURRENT_TIMESTAMP                    | Creation timestamp               |
| `updated_at`     | TIMESTAMP                           | AUTO UPDATE ON UPDATE                        | Last update timestamp            |

#### 8. `import_logs` Table

Audit logs for batch Excel/CSV data migrations.

| Column          | Data Type                                    | Constraints / Default                        | Description                |
| --------------- | -------------------------------------------- | -------------------------------------------- | -------------------------- |
| `id`            | BIGINT UNSIGNED                              | AUTO_INCREMENT, PRIMARY KEY                  | Import batch identifier    |
| `user_id`       | BIGINT UNSIGNED                              | NOT NULL, FK → `users(id)` ON DELETE CASCADE | User who initiated import  |
| `file_name`     | VARCHAR(255)                                 | NOT NULL                                     | Original uploaded filename |
| `total_rows`    | INT                                          | NOT NULL, DEFAULT 0                          | Total rows scanned         |
| `imported_rows` | INT                                          | NOT NULL, DEFAULT 0                          | Successfully inserted rows |
| `failed_rows`   | INT                                          | NOT NULL, DEFAULT 0                          | Rejected / errored rows    |
| `status`        | ENUM('pending','processing','done','failed') | NOT NULL, DEFAULT 'pending'                  | Execution state            |
| `created_at`    | TIMESTAMP                                    | DEFAULT CURRENT_TIMESTAMP                    | Batch upload timestamp     |

#### 9. `audit_logs` Table

Best-effort security event log; no immutable storage or tamper-evidence mechanism is implemented.

| Column       | Data Type             | Constraints / Default                                 | Description                                                                        |
| ------------ | --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `id`         | BIGINT UNSIGNED       | AUTO_INCREMENT, PRIMARY KEY                           | Audit event identifier                                                             |
| `user_id`    | BIGINT UNSIGNED       | NULL, FK to users ON DELETE SET NULL in migration 002 | Go model currently uses a non-pointer uint64                                       |
| `action`     | ENUM in migration 002 | NOT NULL                                              | LOGIN, LOGOUT, PASSWORD_CHANGE, PROFILE_UPDATE, EXCEL_IMPORT, EXPORT, GOAL_CREATED |
| `ip_address` | VARCHAR(45)           | NULL in migration 002                                 | IPv4 or IPv6 client address                                                        |
| `user_agent` | VARCHAR(500)          | NULL in migration 002                                 | Browser / device user-agent string                                                 |
| `metadata`   | JSON                  | NULL in migration 002; absent from model              | AuditLog currently discards metadata                                               |
| `created_at` | TIMESTAMP             | DEFAULT CURRENT_TIMESTAMP                             | Event occurrence timestamp                                                         |

---

### 3.4 Entity Relationships and Integrity

Each financial model has an owning user ID. Categories relate to transactions, budgets and recurring schedules; import logs can relate to imported transactions. Accounts have no link to transactions, and savings goals have no contribution-history relation. The intended SQL uses user cascades for ordinary financial records and SET NULL for audit retention and import links. These are script definitions, not a verified description of an AutoMigrate-created database.

## CHAPTER 4: API & MODULE DESIGN

### 4.1 RESTful API Endpoint Specification Table

All protected routes require the HTTP header `Authorization: Bearer <access_token>`.

| HTTP Method | Route Endpoint                       | Auth Required | Request Payload / Params                                                                   | Status Code & Response Structure                                                            |
| ----------- | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| **POST**    | `/api/v1/auth/register`              | No            | `{ fullName, email, password }`                                                            | `201 Created` → `{ id, fullName, email }`                                                   |
| **POST**    | `/api/v1/auth/login`                 | No            | `{ email, password }`                                                                      | `200 OK` → `{ accessToken, user }` + Set-Cookie                                             |
| **POST**    | `/api/v1/auth/refresh`               | Cookie        | (HttpOnly cookie `refresh_token`)                                                          | `200 OK` → `{ accessToken }`                                                                |
| **POST**    | `/api/v1/auth/logout`                | No            | None                                                                                       | `204 No Content` (clears cookie)                                                            |
| **GET**     | `/api/v1/users/me`                   | Yes           | None                                                                                       | `200 OK` → User profile object                                                              |
| **PUT**     | `/api/v1/users/me`                   | Yes           | `{ fullName, currency, phone, bio, monthlyIncomeGoal, fiscalStartDay, alertThresholdPct }` | `200 OK` → Updated user object                                                              |
| **POST**    | `/api/v1/users/me/password`          | Yes           | `{ currentPassword, newPassword }`                                                         | `200 OK` → `{ message: "password updated successfully" }`                                   |
| **GET**     | `/api/v1/audit-logs`                 | Yes           | None                                                                                       | `200 OK` → Array of last 50 `AuditLog` records                                              |
| **GET**     | `/api/v1/categories`                 | Yes           | `type=expense` or `type=income`                                                            | `200 OK` → Array of `Category` objects                                                      |
| **POST**    | `/api/v1/categories`                 | Yes           | `{ name, type, color, icon }`                                                              | `201 Created` → New `Category` object                                                       |
| **PUT**     | `/api/v1/categories/:id`             | Yes           | `{ name, type, color, icon }`                                                              | `200 OK` → Updated `Category`                                                               |
| **DELETE**  | `/api/v1/categories/:id`             | Yes           | None                                                                                       | `204 No Content` / `409 Conflict`                                                           |
| **GET**     | `/api/v1/transactions`               | Yes           | `?page=1&limit=25&q=...&type=...&categoryId=...&from=...&to=...&sort=amount_desc`          | `200 OK` → `{ data: Transaction[], total, page, limit }`                                    |
| **POST**    | `/api/v1/transactions`               | Yes           | `{ categoryId, amount, description, txnDate, merchant, notes, tags }`                      | `201 Created` → New `Transaction` object                                                    |
| **PUT**     | `/api/v1/transactions/:id`           | Yes           | `{ categoryId, amount, description, txnDate, merchant, notes, tags }`                      | `200 OK` → Updated `Transaction`                                                            |
| **DELETE**  | `/api/v1/transactions/:id`           | Yes           | None                                                                                       | `204 No Content`                                                                            |
| **GET**     | `/api/v1/transactions/template`      | Yes           | None                                                                                       | `200 OK` → Binary Stream `finance_import_template.xlsx`                                     |
| **POST**    | `/api/v1/transactions/import`        | Yes           | `multipart/form-data (file: .xlsx/.csv)`                                                   | `200 OK` → `{ importedRows, failedRows, totalRows, errors: [] }`                            |
| **GET**     | `/api/v1/transactions/export`        | Yes           | `format=xlsx` or `format=csv`                                                              | `200 OK` → Binary Stream (`.xlsx` workbook or `.csv`)                                       |
| **GET**     | `/api/v1/accounts`                   | Yes           | None                                                                                       | `200 OK` → Array of `Account` objects                                                       |
| **POST**    | `/api/v1/accounts`                   | Yes           | `{ name, accountType, balance, currency }`                                                 | `201 Created` → New `Account`                                                               |
| **PUT**     | `/api/v1/accounts/:id`               | Yes           | `{ name, accountType, balance, currency }`                                                 | `200 OK` → Updated `Account`                                                                |
| **DELETE**  | `/api/v1/accounts/:id`               | Yes           | None                                                                                       | `200 OK` → Soft-delete (`is_archived = true`)                                               |
| **GET**     | `/api/v1/recurring`                  | Yes           | None                                                                                       | `200 OK` → Array of `RecurringTransaction`                                                  |
| **POST**    | `/api/v1/recurring`                  | Yes           | `{ title, txnType, categoryId, amount, frequency, nextRunDate }`                           | `201 Created` → Created schedule                                                            |
| **PUT**     | `/api/v1/recurring/:id`              | Yes           | Update fields                                                                              | `200 OK` → Updated schedule                                                                 |
| **DELETE**  | `/api/v1/recurring/:id`              | Yes           | None                                                                                       | `204 No Content`                                                                            |
| **POST**    | `/api/v1/recurring/:id/run`          | Yes           | None                                                                                       | `201 Created` → Creates one transaction and advances schedule; `409` if already posted      |
| **GET**     | `/api/v1/goals`                      | Yes           | None                                                                                       | `200 OK` → Array of `SavingsGoal` with `completionPct`                                      |
| **POST**    | `/api/v1/goals`                      | Yes           | `{ title, targetAmount, currentAmount, deadline, icon, color }`                            | `201 Created` → Created Goal                                                                |
| **PUT**     | `/api/v1/goals/:id`                  | Yes           | Updated fields                                                                             | `200 OK` → Updated Goal                                                                     |
| **DELETE**  | `/api/v1/goals/:id`                  | Yes           | None                                                                                       | `204 No Content`                                                                            |
| **POST**    | `/api/v1/goals/:id/contribute`       | Yes           | `{ amount }`                                                                               | `200 OK` → Updates balance & milestone status                                               |
| **GET**     | `/api/v1/budgets`                    | Yes           | `?month=11&year=2026`                                                                      | `200 OK` → Array of `Budget`                                                                |
| **POST**    | `/api/v1/budgets`                    | Yes           | `{ categoryId, month, year, amountLimit, alertThresholdPct }`                              | `201 Created` → Created Budget                                                              |
| **PUT**     | `/api/v1/budgets/:id`                | Yes           | `{ amountLimit }`                                                                          | `200 OK` → Updated Budget                                                                   |
| **DELETE**  | `/api/v1/budgets/:id`                | Yes           | None                                                                                       | `204 No Content`                                                                            |
| **GET**     | `/api/v1/reports/summary`            | Yes           | `?month=11&year=2026`                                                                      | `200 OK` → `{ totalIncome, totalExpense, balance, savingsRate }`                            |
| **GET**     | `/api/v1/reports/category-breakdown` | Yes           | `?type=expense&from=...&to=...`                                                            | `200 OK` → Array of `{ name, total, percent, color }`                                       |
| **GET**     | `/api/v1/reports/monthly-trend`      | Yes           | `?months=6`                                                                                | `200 OK` → Array of monthly `{ income, expense, balance }`                                  |
| **GET**     | `/api/v1/reports/budget-vs-actual`   | Yes           | `?month=11&year=2026`                                                                      | `200 OK` → Array of `{ categoryName, limit, spent, remaining, utilisationPercent, status }` |

---

### 4.2 Excel and CSV portability

The Transactions page opens an import/export dialog. The template endpoint produces an XLSX workbook with eight positional columns: Date, Type, Category, Amount, Merchant, Description, Notes and Tags. It includes three sample rows that must be removed or replaced before import. XLSX imports read the first worksheet; CSV imports read comma-separated records. Invalid rows produce row numbers and messages while valid rows are committed with an import log. Unknown categories can be created during parsing. The export endpoint returns either an eight-column CSV or a two-sheet XLSX workbook containing Transactions and Summary. The statement XLSX includes an ID column, so it is not directly compatible with the import template. The server exports all transactions for the authenticated user; filtered/selected CSV export is a separate client-side table action.

### 4.3 Profile settings and password changes

The Settings screen provides Profile, Financial Settings and Security sections. Users can update name, phone, bio, currency and income targets. Fiscal start day and alert threshold are stored preferences, not active report rules. The password endpoint verifies the current password and requires at least eight characters including a letter, digit and special character; the replacement hash uses bcrypt cost 12. The last 50 audit events can be displayed. Avatar-file upload and account deletion are incomplete UI paths. Saving profile details does not update the authentication context immediately.

### 4.4 Accounts and savings goals

The API supports creating, editing, listing and archiving account records for bank, credit-card, cash, UPI and digital-wallet types. The Accounts screen still shows a placeholder. Balances are manually stored values because transactions have no account relationship. Savings goals have targets, cumulative saved amounts, deadlines, status, icon and color fields. Users can create, update, delete and contribute to a goal through the interface. Reaching the target marks an active goal completed; individual contribution history and account transfers are not recorded.

### 4.5 Recurring transaction workflow

Schedules support daily, weekly, monthly and yearly frequencies, editable categories and amounts, and active/paused states. Post Now sends POST /recurring/:id/run. The handler locks the owned schedule row, inserts one ledger entry, sets lastRunAt and advances nextRunDate beyond the current time in a database transaction. A previously posted schedule is blocked until its next due date and returns HTTP 409; a successful post returns HTTP 201. Missed periods are advanced without backfilling every occurrence. This is a manual workflow rather than a timed background scheduler.

### 4.6 Interface controls and resilience

Transactions, categories, budgets and recurring schedules support persisted grid/table choices using localStorage. Categories use a shared Lucide icon registry, including the circle fallback, and a color palette. The interface includes themed selects, custom month/day calendars, command-palette navigation, debounced transaction search, multi-column sorting, selection and CSV actions. React.lazy and Suspense split page bundles, skeleton components represent loading states, and root/page/panel error boundaries offer retry or reload. Report data still comes from the existing endpoints. The transaction page loads API pages of 100 before applying advanced filters locally; it does not use server-side faceted filtering or row virtualization.

## CHAPTER 5: IMPLEMENTATION & USER INTERFACE

### 5.1 Backend Implementation Details

The backend is structured under `backend/internal/`:

- `models/`: Clean GORM data structs with JSON and DB tags.
- `handlers/`: HTTP request validation, JSON binding, error serialization, and response writing.
  - `excel.go`: Encapsulates `excelize` template creation, multi-format export, and streaming file uploads.
  - `accounts.go`: Stored account balance management and archival; the Accounts UI is incomplete.
  - `goals.go`: Savings goal milestone percentage math and contribution handling.
  - `recurring.go`: Recurrence frequency validation and manual execution hooks.
- `middleware/`: JWT verification and HTTP security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy).
- `routes/`: Centralized route registration and CORS origin restrictions.

### 5.2 Frontend Implementation Details

Built with React 18 and Vite:

- **`ExcelImportModal.tsx`:** Provides an accessible Dialog container with dual tabs for batch import and template/statement export. Incorporates drag-and-drop file detection and detailed row error tables.
- **`WorkspacePages.tsx`:** Features a unified, tabbed Settings panel (Profile, Financial Settings, Security & Password) with real-time password strength computation (`Weak`, `Medium`, `Strong`) and an active audit login history table.
- **`GoalsPage.tsx`:** Displays responsive card grids for target savings, circular/linear progress bars, deadline countdowns, and contribution modals.
- **`RecurringPage.tsx`:** Manages schedules with status badges, frequency tags, and one-click "Post Now" execution.
- **`CategoriesPage.tsx`:** Separates expenses and incomes, offering interactive Lucide icon pickers and color palettes.
- **`TransactionsPage.tsx`:** Utilizes TanStack Table for sorting, URL query-synced faceted filters, and debounced instant search.

### 5.3 UI/UX Design System

The interface uses shared fintech-style controls and tokens; a full WCAG audit has not been performed:

- **Color Variables:** Dark slate `--accent` (`#343E50`), emerald `--income` (`#087955`), ruby `--expense` (`#BD354F`), amber `--warning` (`#9B650B`).
- **Typography:** Inter sans-serif with `tabular-nums` used on financial values and date displays to stabilize numeric alignment.
- **Micro-interactions:** Keyboard shortcut palette (`⌘K`), active filter chips, and non-blocking toast notifications via `sonner`.

---

### 5.4 Screen Coverage and Evidence

The current route set includes authentication, overview, transactions, categories, budgets, reports, accounts, goals, recurring schedules and profile settings. Accounts remains a placeholder. Grid/table preferences persist for transactions, categories, budgets and recurring schedules. Custom calendar/select controls, lazy page loading, skeletons and recovery boundaries are implemented. Current screenshots must be captured from the running application; placeholder boxes in the Word report are not execution evidence.

## CHAPTER 6: SYSTEM TESTING & SECURITY AUDIT

### 6.1 Verification Method

Source inspection covered registered routes, handlers, models, both migrations, frontend pages and test files. The frontend production build and automated tests were rerun on 18 November 2026. Go was not available on PATH, so this review does not certify backend compilation, go vet, backend tests or a real MySQL migration. No database records were changed.

### 6.2 Observed Frontend Results

- `npm run build`: passed with TypeScript compilation and Vite page/chunk generation.
- `npm test`: 9 files passed, 16 tests passed.
- Coverage includes formatting, select keyboard interaction, date bounds and month navigation, render-error recovery, transaction table/filter/form interactions, persisted view preferences, category duplicate checks, recurring UI and budget grid/table switching.
- `backend/internal/handlers/recurring_test.go` contains two top-level tests for duplicate-post prevention and date advancement; these were inspected, not executed in this review.

### 6.3 Database and API Verification Still Required

The planned authentication, ownership, import/export, profile/password, budget, account, goals and migration tests require a running MySQL test environment. Frontend component tests mock API behavior and do not prove those endpoints work end to end. No load benchmark or completed security penetration assessment is claimed.

### 6.4 Missing and Partial Implementation

| Area                                    | Finding                                                                                                                                                                                                                                                  | Source evidence                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Accounts interface                      | Backend CRUD and archive routes exist, but AccountsPage still renders a placeholder. No transaction account_id or per-account reconciliation exists.                                                                                                     | frontend/src/pages/WorkspacePages.tsx; backend/internal/handlers/accounts.go; backend/internal/models/models.go                  |
| Account deletion and avatar upload      | Settings calls DELETE /users/me, but no such route is registered. The avatar has no upload handler despite its clickable appearance.                                                                                                                     | frontend/src/pages/WorkspacePages.tsx; backend/internal/routes/routes.go                                                         |
| Session refresh and revocation          | Session restoration runs on app load. Axios has no 401 response-refresh interceptor. Password changes and logout do not revoke already issued JWTs.                                                                                                      | frontend/src/api/client.ts; frontend/src/context/AuthContext.tsx; backend/internal/handlers/handlers.go                          |
| Budget preferences                      | The backend warning threshold is 75%; frontend progress bars use 80%. Stored alertThresholdPct, fiscalStartDay and rolloverEnabled do not drive the report calculations. Budget PUT updates amountLimit only.                                            | backend/internal/service/service.go; backend/internal/handlers/handlers.go; frontend/src/components/dashboard/BudgetProgress.tsx |
| Recurring automation                    | Post Now is manual and creates one entry, even after several missed periods. No background worker or reminder delivery exists. RunRecurring does not check is_active before posting; category type consistency is not enforced when creating a schedule. | backend/internal/handlers/recurring.go                                                                                           |
| Spreadsheet import validation           | Categories are resolved by name alone, so identical income/expense names can be ambiguous. Category creation occurs before the transaction/log commit. No duplicate-file protection, upload-size limit or preview-before-commit flow is implemented.     | backend/internal/handlers/excel.go                                                                                               |
| Spreadsheet round trip and export scope | The XLSX statement has an extra leading ID column and cannot be imported directly using the positional eight-column parser. Server exports ignore the transaction filters. Backend CSV output lacks spreadsheet-formula prefix neutralization.           | backend/internal/handlers/excel.go; frontend/src/components/transactions/ExcelImportModal.tsx                                    |
| Database migration parity               | AutoMigrate does not execute the SQL scripts. Model tags do not reproduce all SQL DECIMAL precision, CHECK, ENUM, foreign-key and unique/index definitions. The SQL upgrade omits last_run_at, while the recurring model uses it.                        | backend/internal/database/database.go; backend/internal/models/models.go; backend/migrations/002_enterprise_upgrade.sql          |
| SQL rerun safety                        | The import-batch foreign-key guard checks a fictitious column that is never created. Running migration 002 twice can attempt to add the same constraint again.                                                                                           | backend/migrations/002_enterprise_upgrade.sql                                                                                    |
| Authentication hardening                | No login/register rate limiter is registered. Development JWT fallback secrets can survive production configuration because the startup check rejects only empty values. Refresh tokens lack rotation/revocation storage.                                | backend/internal/routes/routes.go; backend/internal/config/config.go; backend/cmd/server/main.go                                 |
| Audit retention                         | Audit writes are best effort, metadata is discarded, and logout does not create an audit row. The SQL user link uses ON DELETE SET NULL, whereas the Go model uses a non-pointer ID. Audit logs are not tamper-proof.                                    | backend/internal/handlers/handlers.go; backend/internal/models/models.go; backend/migrations/002_enterprise_upgrade.sql          |
| Savings contributions                   | Contributions update a cumulative amount without a contribution-history table or a locked atomic increment. Concurrent updates and goal status validation require stronger coverage.                                                                     | backend/internal/handlers/goals.go                                                                                               |
| Profile update edge cases               | Blank phone/bio/avatar values and a zero income target are ignored, so existing values cannot always be cleared. Client validation is stronger than some server preference validation.                                                                   | backend/internal/handlers/handlers.go; frontend/src/pages/WorkspacePages.tsx                                                     |
| Test and screenshot evidence            | The report's UT/IT/security matrices are plans, not evidence of completed database tests. No real-MySQL integration suite, load benchmark, or current captured application screenshots were found in the report.                                         | backend/internal/handlers/recurring_test.go; frontend/src/**/*.test.tsx; Word report section 4.4                                 |

---

## CHAPTER 7: CONCLUSION & FUTURE WORK

### 7.1 Summary of Contributions

The Spendify Personal Finance Portal implements the main income/expense, budgeting, reporting and data-portability modules. Completion of the remaining workflows and database/security verification is still required:

- A Go API and React/TypeScript client for recording and reviewing personal finances.
- Template-based XLSX/CSV imports, row-level validation results and spreadsheet statement exports.
- Category management, faceted transaction views, monthly budgets, manually posted recurring schedules and cumulative savings goals.
- Password hashing, JWT authentication and best-effort audit events, with remaining security work listed in Chapter 6.

### 7.2 Remaining Work and Future Enhancements

First complete the account UI, supported account deletion/avatar workflow, token-refresh recovery, threshold consistency and database migration parity. Add a real-MySQL integration suite and import/export round-trip tests before treating the portal as deployment-ready. Further work includes scheduled background posting, email/push reminders, contribution history, account-linked transactions, safe concurrent updates and exchange-rate conversion. Receipt parsing, shared households and predictive categorization remain optional research extensions.

---

## REFERENCES

1. Bass, L., Clements, P., & Kazman, R. (2021). _Software Architecture in Practice_ (4th ed.). Addison-Wesley Professional.
2. Donovan, A. A., & Kernighan, B. W. (2015). _The Go Programming Language_. Addison-Wesley.
3. Banks, A., & Porcello, E. (2020). _Learning React: Modern Patterns for Developing React Applications_ (2nd ed.). O'Reilly Media.
4. Fowler, M. (2018). _Refactoring: Improving the Design of Existing Code_ (2nd ed.). Addison-Wesley.
5. Rescorla, E. (2018). _The Transport Layer Security (TLS) Protocol Version 1.3_. RFC 8446, IETF.
6. Jones, M., Bradley, J., & Sakimura, N. (2015). _JSON Web Token (JWT)_. RFC 7519, IETF.
7. Provos, N., & Mazières, D. (1999). _A Future-Adaptable Password Scheme_. Proceedings of the FREENIX Track: 1999 USENIX Annual Technical Conference.
8. Date, C. J. (2019). _An Introduction to Database Systems_ (8th ed.). Pearson.
9. Excelize Development Team. (2026). _Excelize: Go language library for reading and writing Microsoft Excel (XLAM / XLSM / XLSX / XLTM / XLTX) spreadsheets_. https://xuri.me/excelize/
10. TanStack Development Group. (2026). _TanStack Table v8: Headless UI for building powerful tables & datagrids_. https://tanstack.com/table/
11. Gin Web Framework Contributors. (2026). _Gin Web Framework Documentation_. https://gin-gonic.com/
12. Nielsen, J. (1994). _Usability Engineering_. Morgan Kaufmann.
13. OWASP Foundation. (2025). _OWASP Top 10 Web Application Security Risks_. https://owasp.org/www-project-top-ten/
14. Dahlberg, T., Mallat, N., Ondrus, J., & Zmijewska, A. (2008). _Past, present and future of mobile payments research: A literature review_. Electronic Commerce Research and Applications, 7(2), 165-181.

---

## APPENDICES

### Appendix A Database Sources and Migration Differences

The authoritative checked-in DDL files are `backend/migrations/001_init.sql` and `backend/migrations/002_enterprise_upgrade.sql`. Startup runs `backend/internal/database/database.go` AutoMigrate over nine models rather than applying these scripts. The upgrade's fake-column foreign-key guard is not rerun-safe; `last_run_at` is absent from its recurring table; and several model types/constraints differ from the intended SQL. Review these differences in a disposable database before applying changes to existing data. No new migration or production database change was made during this documentation review.

### Appendix B Implementation Source Map

- Excel engine: `backend/internal/handlers/excel.go`.
- Profile, password and audit: `backend/internal/handlers/handlers.go`.
- Accounts, goals and recurrence: `accounts.go`, `goals.go`, `recurring.go` in the same directory.
- Schema definitions: `backend/internal/models/models.go`.
- Frontend import/export: `frontend/src/components/transactions/ExcelImportModal.tsx`.
- Settings and budget views: `frontend/src/pages/WorkspacePages.tsx`.
- Persistent layouts: `frontend/src/hooks/usePersistentView.ts`.
