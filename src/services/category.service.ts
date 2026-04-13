import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryDTO } from "@/types/finance";

function toCategoryDTO(category: { id: string; name: string; createdAt: Date }): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    createdAt: category.createdAt.toISOString(),
  };
}

export const categoryService = {
  async list(): Promise<CategoryDTO[]> {
    const categories = await categoryRepository.findAll();
    return categories.map(toCategoryDTO);
  },

  async create(name: string): Promise<CategoryDTO> {
    const category = await categoryRepository.create(name);
    return toCategoryDTO(category);
  },

  async delete(id: string): Promise<void> {
    await categoryRepository.delete(id);
  },
};
