import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Shared form-field styling for the item/list dialogs (was duplicated in
// ItemRow, RequestNewListLine, StoreSelect, and ProfileSwitcher).
export const fieldClass =
  "min-w-0 flex-1 rounded-md bg-ck-bg px-2 py-1 text-ck-ink outline-none focus:bg-ck-surface focus:ring-1 focus:ring-ck-primary" // min-w-0 lets flex inputs shrink below their intrinsic width instead of forcing the dialog wider than the screen

export const qtyClass =
  "w-20 rounded-md bg-ck-bg px-2 py-1 text-ck-ink outline-none focus:bg-ck-surface focus:ring-1 focus:ring-ck-primary"
