import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const clsxm = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};
