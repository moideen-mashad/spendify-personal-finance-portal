import type { Transaction } from "./index";

export interface TransactionPage {
  data: Transaction[];
  page: number;
  limit: number;
  total: number;
}

export interface Trend {
  year: number;
  month: number;
  label: string;
  income: number;
  expense: number;
  balance: number;
}

export interface Breakdown {
  categoryId: number;
  name: string;
  color: string;
  total: number;
  percent: number;
}

export interface BudgetActual {
  budgetId: number;
  categoryId: number;
  categoryName: string;
  color: string;
  limit: number;
  spent: number;
  remaining: number;
  utilisationPercent: number;
  status: string;
}

export interface TransactionInput {
  categoryId: number;
  amount: number;
  description: string;
  txnDate: string;
}

export interface ImportResult {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
}
