import { z } from "zod";
import { CATEGORY_ICON_NAMES } from "@/lib/category-icons";

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Informe um nome com pelo menos 2 caracteres")
    .max(40, "Nome muito longo")
    .trim(),
  icon: z.enum(CATEGORY_ICON_NAMES, {
    message: "Escolha um icone valido",
  }),
});

export const transactionSchema = z.object({
  title: z
    .string()
    .min(2, "Informe um titulo com pelo menos 2 caracteres")
    .max(80, "Titulo muito longo")
    .trim(),
  amount: z.number().positive("Valor deve ser maior que zero"),
  type: z.enum(["income", "expense"]),
  categoryId: z.string().uuid("Categoria invalida"),
  createdAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data invalida. Use AAAA-MM-DD"),
});

export const monthFilterSchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Mes invalido. Use AAAA-MM")
    .optional(),
});

export type CreateCategoryInput = z.infer<typeof categorySchema>;
export type CreateTransactionInput = z.infer<typeof transactionSchema>;
