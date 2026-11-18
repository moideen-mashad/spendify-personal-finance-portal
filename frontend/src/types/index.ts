export type User = {
  id: number;
  fullName: string;
  email: string;
  currency: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;
  monthlyIncomeGoal?: number;
  fiscalStartDay?: number;
  alertThresholdPct?: number;
};

export type Category = {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string;
  icon?: string;
  isDefault?: boolean;
};

export type Transaction = {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryType: string;
  categoryColor: string;
  categoryIcon?: string;
  amount: number;
  description: string;
  txnDate: string;
  merchant?: string;
  notes?: string;
  tags?: string;
};

export type Account = {
  id: number;
  name: string;
  accountType: "bank" | "credit_card" | "cash" | "upi" | "digital_wallet";
  balance: number;
  currency: string;
  isArchived: boolean;
};

export type RecurringTransaction = {
  id: number;
  title: string;
  txnType: "income" | "expense";
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextRunDate: string;
  isActive: boolean;
  categoryId: number;
  categoryName?: string;
};

export type SavingsGoal = {
  id: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  color: string;
  status: "active" | "completed" | "paused";
  completionPct?: number;
};

export type AuditLog = {
  id: number;
  action: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
};

export type Summary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
};
