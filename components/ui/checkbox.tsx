import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label className="flex items-start space-x-3 cursor-pointer">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              className={cn(
                "h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 transition-colors duration-200",
                error && "border-red-300 focus:ring-red-500/20",
                className
              )}
              ref={ref}
              {...props}
            />
          </div>
          <div className="text-sm">
            {label && (
              <span className="font-medium text-gray-700">{label}</span>
            )}
            {helperText && !error && (
              <p className="text-gray-500 mt-0.5">{helperText}</p>
            )}
            {error && (
              <p className="text-red-600 mt-0.5">{error}</p>
            )}
          </div>
        </label>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <label className="flex items-start space-x-3 cursor-pointer">
          <div className="flex items-center h-5">
            <input
              type="radio"
              className={cn(
                "h-4 w-4 text-blue-600 border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 transition-colors duration-200",
                error && "border-red-300 focus:ring-red-500/20",
                className
              )}
              ref={ref}
              {...props}
            />
          </div>
          <div className="text-sm">
            {label && (
              <span className="font-medium text-gray-700">{label}</span>
            )}
            {helperText && !error && (
              <p className="text-gray-500 mt-0.5">{helperText}</p>
            )}
            {error && (
              <p className="text-red-600 mt-0.5">{error}</p>
            )}
          </div>
        </label>
      </div>
    );
  }
);
Radio.displayName = 'Radio';
