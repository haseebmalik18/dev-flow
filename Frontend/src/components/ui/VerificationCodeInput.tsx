import React, { useState, useRef, useCallback } from "react";

interface VerificationCodeInputProps {
  onComplete: (code: string) => void;
  error?: string;
  disabled?: boolean;
  length?: number;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  onComplete,
  error,
  disabled = false,
  length = 6,
}) => {
  const [code, setCode] = useState(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastSubmittedCode = useRef<string>("");
  const submissionTimeout = useRef<NodeJS.Timeout | null>(null);

  const debouncedComplete = useCallback(
    (fullCode: string) => {
      if (disabled || fullCode === lastSubmittedCode.current) {
        return;
      }

      if (submissionTimeout.current) {
        clearTimeout(submissionTimeout.current);
      }

      submissionTimeout.current = setTimeout(() => {
        if (
          fullCode.length === length &&
          fullCode !== lastSubmittedCode.current
        ) {
          lastSubmittedCode.current = fullCode;
          onComplete(fullCode);
        }
      }, 300);
    },
    [onComplete, disabled, length]
  );

  const handleChange = (index: number, value: string) => {
    if (disabled) return;

    const digit = value.replace(/\D/g, "");
    if (digit.length > 1) return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join("");
    if (fullCode.length === length) {
      debouncedComplete(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const fullCode = code.join("");
      if (fullCode.length === length) {
        debouncedComplete(fullCode);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;

    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "");

    if (pastedData.length === length) {
      const newCode = pastedData.split("");
      setCode(newCode);
      debouncedComplete(pastedData);
    }
  };

  React.useEffect(() => {
    if (error) {
      lastSubmittedCode.current = "";
      if (submissionTimeout.current) {
        clearTimeout(submissionTimeout.current);
      }
    }
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center space-x-3">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`w-12 h-12 text-center text-xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
              error
                ? "border-red-300 bg-red-50"
                : disabled
                ? "border-gray-200 bg-gray-100 text-gray-400"
                : "border-gray-300 hover:border-gray-400"
            }`}
            autoComplete="one-time-code"
          />
        ))}
      </div>
      {error && (
        <p className="text-red-500 text-sm text-center mt-2">{error}</p>
      )}
    </div>
  );
};
