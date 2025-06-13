import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?'; // Return a placeholder if name is null or undefined
  const nameParts = name.split(' ').filter(Boolean); // Filter out empty strings from split
  if (nameParts.length === 0) return '?'; // Return placeholder if no valid parts after split
  return nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();
};
