import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const FALLBACK_PRODUCT_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f1f5f9'/%3E%3Cpath d='M160 180a20 20 0 1 0 0-40 20 20 0 0 0 0 40zm80-20l-50 65-35-45-55 70h180l-40-90z' fill='%23cbd5e1'/%3E%3C/svg%3E";

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  if (e.currentTarget.src !== FALLBACK_PRODUCT_IMAGE) {
    e.currentTarget.src = FALLBACK_PRODUCT_IMAGE;
  }
}
