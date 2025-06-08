import React, { forwardRef } from "react";
import { clsx } from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, ...props }, ref) => {
    return (
      <div className="space-y-2 group/input">
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within/input:text-blue-500 transition-all duration-300 z-10 group-focus-within/input:scale-110">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              "w-full px-4 py-3 border border-gray-300 rounded-md shadow-sm",
              "placeholder:text-gray-400 text-gray-900 bg-white",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
              "transition-all duration-300",
              "hover:border-gray-400",
              "group-focus-within/input:scale-[1.02] group-focus-within/input:shadow-lg",
              icon && "pl-12",
              error &&
                "border-red-300 focus:ring-red-500 focus:border-red-500 shake",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 animate-in slide-in-from-left-1 duration-200 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
