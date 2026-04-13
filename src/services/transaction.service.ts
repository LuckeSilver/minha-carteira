import { transactionRepository } from "@/repositories/transaction.repository";
import { categoryService } from "@/services/category.service";
import type { DashboardResponse, DashboardSummary, TransactionDTO } from "@/types/finance";

function toTransactionDTO(transaction: {
  id: string;
  title: string;
  amount: { toNumber: () => number };
  type: string;
  categoryId: string;
  createdAt: Date;
  category: { name: string };
}): TransactionDTO {
  return {
    id: transaction.id,
    title: transaction.title,
    amount: transaction.amount.toNumber(),
    type: transaction.type as "income" | "expense",
    categoryId: transaction.categoryId,
    categoryName: transaction.category.name,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function getSummary(transactions: TransactionDTO[]): DashboardSummary {
  const totals = transactions.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.totalIncome += item.amount;
      } else {
        acc.totalExpense += item.amount;
      }
      return acc;
    },
    { totalIncome: 0, totalExpense: 0 },
  );

  return {
    ...totals,
    balance: totals.totalIncome - totals.totalExpense,
  };
}

export const transactionService = {
  async list(month?: string): Promise<TransactionDTO[]> {
    const transactions = await transactionRepository.findByMonth(month);
    return transactions.map(toTransactionDTO);
  },

  async create(data: {
    title: string;
    amount: number;
    type: "income" | "expense";
    categoryId: string;
    createdAt: string;
  }): Promise<TransactionDTO> {
    const transaction = await transactionRepository.create(data);
    return toTransactionDTO(transaction);
  },

  async delete(id: string): Promise<void> {
    await transactionRepository.delete(id);
  },

  async dashboard(month: string): Promise<DashboardResponse> {
    const [categories, transactions] = await Promise.all([
      categoryService.list(),
      this.list(month),
    ]);

    return {
      summary: getSummary(transactions),
      categories,
      transactions,
      month,
    };
  },
};
