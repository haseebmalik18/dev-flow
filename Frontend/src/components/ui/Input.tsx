import React, { forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-2">
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              "w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm",
              "placeholder:text-gray-400 text-gray-900 bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "transition-colors duration-200",
              "hover:border-gray-400",
              icon && "pl-10",
              error && "border-red-300 focus:ring-red-500 focus:border-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
