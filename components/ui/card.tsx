import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const cardVariants = {
  default: "bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200",
  elevated: "bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200",
  outlined: "bg-white border border-gray-200 shadow-none hover:border-gray-300 transition-colors duration-200"
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof cardVariants;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl overflow-hidden",
        cardVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, action, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4 border-b border-gray-100 text-gray-900", className)}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold leading-6">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm leading-5">
              {subtitle}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4", className)}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-6", className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, action, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("px-6 py-4 border-t border-gray-100 bg-gray-50/50", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {children}
        </div>
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
