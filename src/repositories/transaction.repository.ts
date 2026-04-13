import { prisma } from "@/lib/prisma";

export const transactionRepository = {
  async findByMonth(month?: string) {
    const where = month
      ? {
          createdAt: {
            gte: new Date(`${month}-01T00:00:00.000Z`),
            lt: new Date(new Date(`${month}-01T00:00:00.000Z`).setMonth(new Date(`${month}-01T00:00:00.000Z`).getMonth() + 1)),
          },
        }
      : undefined;

    return prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
      },
    });
  },

  async create(data: {
    title: string;
    amount: number;
    type: "income" | "expense";
    categoryId: string;
    createdAt: string;
  }) {
    return prisma.transaction.create({
      data: {
        title: data.title,
        amount: data.amount,
        type: data.type,
        categoryId: data.categoryId,
        createdAt: new Date(`${data.createdAt}T00:00:00.000Z`),
      },
      include: {
        category: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.transaction.delete({
      where: { id },
    });
  },
};
