import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BriefcaseBusiness,
  CarFront,
  GraduationCap,
  HeartPulse,
  House,
  PiggyBank,
  Receipt,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";

export const CATEGORY_ICON_NAMES = [
  "receipt",
  "shopping-bag",
  "house",
  "car-front",
  "utensils-crossed",
  "graduation-cap",
  "briefcase-business",
  "piggy-bank",
  "banknote",
  "heart-pulse",
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

export const DEFAULT_CATEGORY_ICON: CategoryIconName = "receipt";

export const CATEGORY_ICON_OPTIONS: Array<{
  value: CategoryIconName;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "receipt", label: "Geral", icon: Receipt },
  { value: "shopping-bag", label: "Compras", icon: ShoppingBag },
  { value: "house", label: "Moradia", icon: House },
  { value: "car-front", label: "Transporte", icon: CarFront },
  { value: "utensils-crossed", label: "Alimentacao", icon: UtensilsCrossed },
  { value: "graduation-cap", label: "Educacao", icon: GraduationCap },
  { value: "briefcase-business", label: "Trabalho", icon: BriefcaseBusiness },
  { value: "piggy-bank", label: "Reserva", icon: PiggyBank },
  { value: "banknote", label: "Renda", icon: Banknote },
  { value: "heart-pulse", label: "Saude", icon: HeartPulse },
];

const categoryIconMap = new Map(
  CATEGORY_ICON_OPTIONS.map((option) => [option.value, option.icon]),
);

export function getCategoryIcon(iconName: string): LucideIcon {
  return categoryIconMap.get(iconName as CategoryIconName) ?? Receipt;
}
