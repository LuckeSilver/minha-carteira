"use server";

import { monthFilterSchema } from "@/lib/validators";
import { toMonthInputValue } from "@/lib/format";
import { transactionService } from "@/services/transaction.service";

export async function getDashboardData(month?: string) {
  const parseResult = monthFilterSchema.safeParse({ month });
  const selectedMonth = parseResult.success
    ? parseResult.data.month ?? toMonthInputValue()
    : toMonthInputValue();

  try {
    return await transactionService.dashboard(selectedMonth);
  } catch {
    return {
      summary: {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
      },
      categories: [],
      transactions: [],
      month: selectedMonth,
    };
  }
}
