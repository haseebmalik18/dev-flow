import React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  ...props
}) => {
  const baseClasses =
    "relative inline-flex items-center justify-center font-medium rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group";

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0",
    secondary:
      "bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 border border-gray-300 hover:scale-[1.02] hover:shadow-md",
    outline:
      "border border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500 hover:scale-[1.02] hover:shadow-md",
    ghost:
      "text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500 hover:scale-[1.02]",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={clsx(baseClasses, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {variant === "primary" && (
        <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-12"></div>
      )}

      <span className="relative z-10 flex items-center transition-transform duration-200 group-hover:scale-105">
        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {!loading && icon && <span className="mr-2">{icon}</span>}
        {children}
      </span>

      {variant === "primary" && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
      )}
    </button>
  );
};
