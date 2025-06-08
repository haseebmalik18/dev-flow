import React, { useState, useRef, useEffect } from "react";
import type { ChangeEvent, KeyboardEvent, ClipboardEvent } from "react";

interface VerificationCodeInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  length = 6,
  onComplete,
  error,
  disabled = false,
}) => {
  const [values, setValues] = useState<string[]>(new Array(length).fill(""));
  const [focused, setFocused] = useState<number>(-1);
  const inputRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
      setFocused(0);
    }
  }, [disabled]);

  useEffect(() => {
    const code = values.join("");
    if (code.length === length && code.replace(/\s/g, "").length === length) {
      onComplete(code);
    }
  }, [values, length, onComplete]);

  const handleChange = (index: number, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");

    if (numericValue.length <= 1) {
      const newValues = [...values];
      newValues[index] = numericValue;
      setValues(newValues);

      if (numericValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
        setFocused(index + 1);
      }
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newValues = [...values];

      if (values[index]) {
        newValues[index] = "";
        setValues(newValues);
      } else if (index > 0) {
        newValues[index - 1] = "";
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
        setFocused(index - 1);
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocused(index - 1);
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocused(index + 1);
    }

    if (e.key === "Enter") {
      const code = values.join("");
      if (code.length === length) {
        onComplete(code);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const numericData = pastedData.replace(/[^0-9]/g, "");

    if (numericData.length > 0) {
      const newValues = [...values];
      const startIndex = Math.max(
        0,
        values.findIndex((v) => v === "")
      );

      for (
        let i = 0;
        i < Math.min(numericData.length, length - startIndex);
        i++
      ) {
        newValues[startIndex + i] = numericData[i];
      }

      setValues(newValues);

      const nextIndex = Math.min(startIndex + numericData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocused(nextIndex);
    }
  };

  const handleFocus = (index: number) => {
    setFocused(index);

    inputRefs.current[index]?.select();
  };

  const handleBlur = () => {
    setFocused(-1);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-3">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => {
              if (el) inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={value}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              handleChange(index, e.target.value)
            }
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
              handleKeyDown(index, e)
            }
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onBlur={handleBlur}
            disabled={disabled}
            className={`
              w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
              transition-all duration-300 outline-none
              ${
                focused === index
                  ? "border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/25 scale-105"
                  : "border-gray-300 bg-white hover:border-gray-400"
              }
              ${
                error
                  ? "border-red-500 bg-red-50 text-red-900"
                  : "text-gray-900"
              }
              ${
                disabled
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "hover:shadow-md"
              }
              ${
                value
                  ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400"
                  : ""
              }
            `}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        ))}
      </div>

      {error && (
        <div className="text-center">
          <p className="text-sm text-red-600 animate-in slide-in-from-bottom-2 duration-300 flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              />
            </svg>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};
