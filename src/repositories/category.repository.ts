import { prisma } from "@/lib/prisma";

export const categoryRepository = {
  async findAll() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  },

  async create(name: string) {
    return prisma.category.create({
      data: { name },
    });
  },

  async delete(id: string) {
    return prisma.category.delete({
      where: { id },
    });
  },
};
