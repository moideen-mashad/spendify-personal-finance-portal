import {
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Heart,
  GraduationCap,
  Plane,
  Film,
  Music,
  Dumbbell,
  Coffee,
  Briefcase,
  TrendingUp,
  Gift,
  Landmark,
  Circle,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  shopping: ShoppingBag,
  car: Car,
  home: Home,
  zap: Zap,
  heart: Heart,
  graduation: GraduationCap,
  plane: Plane,
  film: Film,
  music: Music,
  dumbbell: Dumbbell,
  briefcase: Briefcase,
  trending: TrendingUp,
  gift: Gift,
  bank: Landmark,
  circle: Circle,
};

export function getCategoryIcon(icon?: string): LucideIcon {
  return CATEGORY_ICONS[icon || "circle"] || Circle;
}
