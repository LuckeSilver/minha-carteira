import { categoryRepository } from "@/repositories/category.repository";
import type { CategoryDTO } from "@/types/finance";

function toCategoryDTO(category: { id: string; name: string; icon: string; createdAt: Date }): CategoryDTO {
  return {
    id: category.id,
    name: category.name,
    icon: category.icon,
    createdAt: category.createdAt.toISOString(),
  };
}

export const categoryService = {
  async list(): Promise<CategoryDTO[]> {
    const categories = await categoryRepository.findAll();
    return categories.map(toCategoryDTO);
  },

  async create(data: { name: string; icon: string }): Promise<CategoryDTO> {
    const category = await categoryRepository.create(data);
    return toCategoryDTO(category);
  },

  async update(id: string, data: { name: string; icon: string }): Promise<CategoryDTO> {
    const category = await categoryRepository.update(id, data);
    return toCategoryDTO(category);
  },

  async delete(id: string): Promise<void> {
    await categoryRepository.delete(id);
  },
};
