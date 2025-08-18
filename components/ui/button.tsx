import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = {
  primary: "bg-gray-900 text-white border border-gray-900 hover:bg-gray-800 hover:border-gray-800 focus:ring-2 focus:ring-gray-900/20 focus:outline-none shadow-sm",
  secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-gray-500/20 focus:outline-none shadow-sm",
  outline: "bg-transparent text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-2 focus:ring-gray-500/20 focus:outline-none",
  danger: "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 focus:ring-2 focus:ring-red-500/20 focus:outline-none shadow-sm",
  success: "bg-green-600 text-white border border-green-600 hover:bg-green-700 hover:border-green-700 focus:ring-2 focus:ring-green-500/20 focus:outline-none shadow-sm",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-2 focus:ring-gray-500/20 focus:outline-none"
};

const buttonSizes = {
  sm: "px-3 py-1.5 text-sm font-medium rounded-md",
  md: "px-4 py-2 text-sm font-medium rounded-lg",
  lg: "px-6 py-3 text-base font-medium rounded-lg",
  xl: "px-8 py-4 text-lg font-medium rounded-xl"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, icon, iconPosition = "left", children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
          buttonVariants[variant],
          buttonSizes[size],
          loading && "cursor-wait",
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {!loading && icon && iconPosition === "left" && (
          <span className="mr-2">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === "right" && (
          <span className="ml-2">{icon}</span>
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';

export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = "md", variant = "ghost", ...props }, ref) => {
    const iconSizes = {
      sm: "p-1.5",
      md: "p-2",
      lg: "p-3",
      xl: "p-4"
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn(iconSizes[size], "min-w-0", className)}
        {...props}
      />
    );
  }
);
IconButton.displayName = 'IconButton';
