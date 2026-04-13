import { prisma } from "@/lib/prisma";

export const categoryRepository = {
  async findAll() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  },

  async create(data: { name: string; icon: string }) {
    return prisma.category.create({
      data,
    });
  },

  async delete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
