import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Code2 } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../hooks/useAuth";
import type { LoginRequest } from "../../types/auth";

const TypingAnimation: React.FC<{ text: string; className?: string }> = ({
  text,
  className,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 80);

    return () => clearInterval(timer);
  }, [text]);

  return (
    <h2 className={`${className} transition-all duration-300`}>
      <span className="inline-block">
        {displayedText.split("").map((char, index) => (
          <span
            key={index}
            className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-200"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        ))}
      </span>
      {isTyping && (
        <span className="inline-block w-0.5 h-6 bg-blue-600 ml-1 animate-pulse"></span>
      )}
    </h2>
  );
};

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    setIsLoading(true);
    try {
      await login(data);
    } catch (error) {
      // Error handling is done in the useAuth hook
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50/80 to-purple-50/60">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-3/4 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>

        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

        <div className="absolute inset-0 opacity-[0.015] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8ZGVmcz4KICAgIDxmaWx0ZXIgaWQ9Im5vaXNlIj4KICAgICAgPGZlVHVyYnVsZW5jZSBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjEiIHNlZWQ9IjEiLz4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjEiLz4KPC9zdmc+')]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 animate-in slide-in-from-bottom-4 duration-700">
        <div className="text-center group">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-2xl shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
            <Code2 className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
          </div>

          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3 group-hover:from-blue-700 group-hover:via-purple-700 group-hover:to-indigo-700 transition-all duration-500">
            DevFlow
          </h1>

          <TypingAnimation
            text="Welcome Back"
            className="text-2xl font-semibold text-gray-900 mb-2"
          />
          <p className="text-gray-600 text-sm">
            Sign in to your DevFlow account
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 hover:bg-white/90 hover:shadow-3xl transition-all duration-500">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <Input
                {...register("usernameOrEmail", {
                  required: "Username or email is required",
                })}
                type="text"
                placeholder="Username or email"
                icon={<Mail className="w-5 h-5" />}
                error={errors.usernameOrEmail?.message}
                className="rounded-2xl py-4 bg-white/70 backdrop-blur-sm border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 hover:border-gray-300 hover:bg-white/80 transition-all duration-300"
              />

              <div className="relative">
                <Input
                  {...register("password", {
                    required: "Password is required",
                  })}
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  icon={<Lock className="w-5 h-5" />}
                  error={errors.password?.message}
                  className="rounded-2xl py-4 bg-white/70 backdrop-blur-sm border-gray-200 focus:border-blue-400 focus:ring-blue-500/20 hover:border-gray-300 hover:bg-white/80 transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110 z-10"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                to="/forgot-password"
                className="group relative text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
              >
                <span className="relative z-10">Forgot password?</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-500 ease-out"></span>
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl font-semibold"
              loading={isLoading}
              size="lg"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="group relative text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-300"
              >
                <span className="relative z-10">Sign up</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-500 ease-out"></span>
              </Link>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Intelligent Project Management Platform
          </p>
        </div>
      </div>
    </div>
  );
};
