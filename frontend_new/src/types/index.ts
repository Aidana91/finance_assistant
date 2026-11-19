export type TransactionType = "income" | "expense";

export interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  comment: string;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string;
  completed: number | boolean;
}

export interface Settings {
  id: number;
  theme: "light" | "dark";
  currency: string;
  language: "ru" | "en" | "kk";
  llm_model: string;
}

export interface AnalyticsData {
  expenses_by_category: Record<string, number>;
  top_categories: Array<{ name: string; value: number }>;
  monthly_expenses: Array<{ month: string; amount: number }>;
  balance_over_time: Array<{ month: string; balance: number }>;
  monthly_comparison: Array<{ month: string; income: number; expenses: number }>;
  current_month: {
    month: string;
    income: number;
    expenses: number;
    income_change: number;
    expense_change: number;
    balance: number;
  };
  average_daily_expense: number;
  forecast_expenses: number;
  income: number;
  expenses: number;
}
