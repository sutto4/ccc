import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Vercel/Tailwind/VS Code inspired utility classes
export const spacing = {
  xs: "space-y-1",      // 4px
  sm: "space-y-2",      // 8px
  md: "space-y-4",      // 16px
  lg: "space-y-6",      // 24px
  xl: "space-y-8",      // 32px
  "2xl": "space-y-12",  // 48px
  "3xl": "space-y-16",  // 64px
};

export const layout = {
  container: "max-w-7xl mx-auto px-6 sm:px-8 lg:px-12",
  card: "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200",
  section: "py-8 sm:py-12 lg:py-16",
  grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8",
  sidebar: "w-64 bg-white border-r border-gray-200 shadow-sm",
  header: "bg-white border-b border-gray-200/60 backdrop-blur-sm sticky top-0 z-10",
};

export const text = {
  heading: "text-2xl font-bold tracking-tight",
  subheading: "text-xl font-semibold",
  title: "text-lg font-semibold",
  body: "text-base leading-relaxed",
  caption: "text-sm",
  label: "text-sm font-medium",
  code: "font-mono text-sm px-1.5 py-0.5 rounded",
  link: "text-blue-600 hover:text-blue-700 transition-colors duration-200",
};
