# Spendify UI architecture

This upgrade is frontend-only. The Go API, SQL schema, authentication contract, and financial calculations remain unchanged. All dashboard values come from the existing API; the interface does not generate sample balances or fabricated comparisons.

## Component map

```text
src/
  components/
    AppShell.tsx                    sidebar, header, theme, command palette
    DateRangeSelector.tsx           transaction date presets and custom range
    Feedback.tsx                    skeleton, empty, error states
    ui/dialog.tsx                   Radix accessible dialog/sheet primitive
    dashboard/KPIOverview.tsx       API summary cards and sparklines
    dashboard/BudgetProgress.tsx    80%/100% visual budget thresholds
    transactions/
      FacetedFilterBar.tsx          debounced search and filters
      TransactionsDataTable.tsx    TanStack v8 sorting/selection/pagination
      TransactionDrawer.tsx        React Hook Form + Zod add/edit
  hooks/useFinance.ts              abortable report requests
  pages/OverviewPage.tsx           dashboard and analytics
  pages/TransactionsPage.tsx       URL state, data adapter, mutations
  pages/WorkspacePages.tsx         budgets, accounts, settings
  types/finance.ts                 shared Go-response interfaces
  fintech.css                     semantic tokens and responsive styles
```

The dialog is a local, editable Radix primitive following the shadcn/ui composition approach. Its focus trap, Escape dismissal, screen-reader title, and focus restoration are provided by Radix. Components are source-owned, not a hosted design-system dependency.

## Customizing the design

Edit the CSS variables in `fintech.css` for light/dark surfaces, text, borders, and semantic colors. Theme preference alone is saved to localStorage. Authentication tokens remain in memory. Inter loads through Google Fonts with a system-font fallback. Financial columns use tabular numerals. Chart categories use neutral blue/slate tones; emerald indicates income/under-budget, rose indicates expense/over-budget, and amber indicates visual warnings at 80%. The API's existing 75% business threshold is not modified.

Edit `AppShell.tsx` for navigation/branding, `KPIOverview.tsx` for cards, and `TransactionDrawer.tsx` for transaction form labels. The original API calls are centralized through `api/client.ts`.

## Interactions and limitations

- Ctrl/Cmd+K opens page search and the add-transaction action. `/` focuses transaction search. Search waits 300ms before filtering.
- Table header clicks cycle ascending/descending/none and accumulate multi-column sorting. Page size, search, facets, dates, and sort state are represented in the URL.
- The existing backend supports only income and expense. Transfer, posting status, notes, tags, bank linking, and account balances are deliberately not fabricated. Accounts explains the current manual ledger scope.
- The header date presets open filtered transactions. Dashboard summary and budgets use a month selector, matching their API contract. Cash flow shows the six months returned by the API, and is labeled separately.
- The API supports page/limit but cannot perform the requested multi-category, amount-range, or multi-column queries. The UI loads API pages of 100 then filters/sorts/paginates the complete loaded ledger locally. This preserves correctness for all records but is **not** a scalable server-side table for very large ledgers. Switch the adapter to remote filtering when the API supports the contract below.
- The drawer preserves entered data on failure. Bulk edits/deletes optimistically update the view, roll back local state on failure, then reload authoritative records. Multiple API writes are not atomic: partial success is explicitly reported and reloaded.
- CSV exports the actual filtered/selected records, escapes quotes and spreadsheet formula prefixes, and requires no token in a URL.
- Mobile renders selectable transaction cards and moves facets into a bottom sheet.
- Net balance means income minus expenses for the selected month. It is not a bank account balance. Prior-period deltas are only shown when a nonzero previous value is available. Savings-rate sparklines derive the displayed rate from each report period's income/expense totals.

## Future Go query adapter (documentation only)

No Go files were changed. A future backend adapter can parse the UI query contract before applying it to a user-scoped repository query:

```go
type TransactionQuery struct {
    Search, Type, SortBy, Order string
    Categories []uint64
    MinAmount, MaxAmount *decimal.Decimal
    Page, Limit int
}

// Parse integer parameters strictly and reject invalid values with HTTP 400.
// Defaults: page=1, limit=25; permitted limits: 10, 25, 50, 100.
// Parse repeated category parameters as uint64; reject zero/non-numeric IDs.
// Parse min_amount/max_amount with decimal.NewFromString, never float64.
// Reject negative amounts and min_amount > max_amount.
// Validate type against the types implemented by the schema.
// Validate search length, ISO dates, and from <= to before querying.

// SQL identifiers cannot be parameters: map validated keys to fixed literals.
columns := map[string]string{
    "date": "transactions.txn_date",
    "amount": "transactions.amount",
    "description": "transactions.description",
    "category": "categories.name",
}
column, ok := columns[q.SortBy]
if !ok { /* return 400 */ }
if q.Order != "asc" && q.Order != "desc" { /* return 400 */ }

dbq := db.Model(&models.Transaction{}).
    Joins("JOIN categories ON categories.id = transactions.category_id").
    Where("transactions.user_id = ?", authenticatedUserID)
if q.Search != "" {
    dbq = dbq.Where("transactions.description LIKE ?", "%"+q.Search+"%")
}
if len(q.Categories) > 0 {
    dbq = dbq.Where("transactions.category_id IN ?", q.Categories)
}
if q.Type != "" { dbq = dbq.Where("categories.type = ?", q.Type) }
if q.MinAmount != nil { dbq = dbq.Where("transactions.amount >= ?", *q.MinAmount) }
if q.MaxAmount != nil { dbq = dbq.Where("transactions.amount <= ?", *q.MaxAmount) }
// Count with the same filters before LIMIT/OFFSET.
// Prefer clause.OrderByColumn with the whitelisted identifier.
dbq = dbq.Order(clause.OrderByColumn{
    Column: clause.Column{Name: column}, Desc: q.Order == "desc",
}).Order("transactions.id DESC").Offset((q.Page-1)*q.Limit).Limit(q.Limit)
```

Map frontend `q` to `search`, repeated `category` to category IDs, and `sort=txnDate:desc,amount:asc` to validated ordering terms. A single-sort API can expose `sort_by`/`order`; multi-sort needs a validated list. Do not pass raw URL sort strings into `Order`. Unsupported status/transfer filters require a separately authorized backend/schema design.

## Verification

## Calendars, loading, and recovery

Native date/month popups have been replaced by shared `DatePicker` and `MonthPicker` controls. Dates remain ISO strings at the API boundary. Calendars use local dates, honor range bounds, support keyboard selection, and provide Today/This month shortcuts. Theme styling is in `calendar.css`.

Every route uses `React.lazy` with `Suspense`. `LoadingStates.tsx` provides page, session, table, chart, and budget skeletons with reduced-motion support. The root boundary covers providers and the shell, per-route boundaries reset on navigation, dashboard `SafePanel` boundaries isolate widgets, and the transaction form has its own boundary. Retry remounts the failed subtree; Reload also recovers stale lazy-chunk failures. Render boundaries do not catch event-handler or network promise failures—those still need explicit request error states/catches. No backend behavior changes are required.

## Checks

From `frontend`: `npm run format`, `npm run build`, `npm test`.
For manual checks with a running API: open Dashboard, Transactions, Budgets, and Settings at desktop and mobile widths; exercise filters, sorting, CSV, drawer validation, keyboard focus, theme switching, and API failure retry. No backend end-to-end validation should be claimed from a frontend build alone.
