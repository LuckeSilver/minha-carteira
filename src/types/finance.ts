export type TransactionType = "income" | "expense";

export type CategoryDTO = {
  id: string;
  name: string;
  icon: string;
  createdAt: string;
};

export type TransactionDTO = {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  createdAt: string;
};

export type DashboardSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

export type DashboardResponse = {
  summary: DashboardSummary;
  categories: CategoryDTO[];
  transactions: TransactionDTO[];
  month: string;
};
