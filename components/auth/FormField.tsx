import { InputHTMLAttributes, SelectHTMLAttributes } from "react";

interface BaseFieldProps {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  locked?: boolean;
}

type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: "input";
  };

type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    as: "select";
    children: React.ReactNode;
  };

type FormFieldProps = InputFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const { label, id, error, hint, locked, as = "input", ...rest } = props;

  const baseInputClass = `
    w-full border bg-[#111111] px-4 py-2.5 font-mono text-sm
    text-[#ededed] placeholder-[#555555] outline-none
    transition-all duration-200
    focus:border-[#22c55e] focus:ring-1 focus:ring-[#22c55e]
    disabled:cursor-not-allowed disabled:opacity-50
    ${error ? "border-[#ef4444]" : "border-[#333333]"}
    ${locked ? "opacity-60 cursor-not-allowed" : ""}
  `;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#888888]"
      >
        {locked && (
          <svg
            className="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="0" ry="0" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        )}
        {label}
      </label>

      {as === "select" ? (
        <select
          id={id}
          className={baseInputClass + " cursor-pointer appearance-none"}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input
          id={id}
          disabled={locked}
          className={baseInputClass}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hint && !error && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#555555]">
          {hint}
        </p>
      )}
      {error && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#ef4444]">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}