import { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { Input } from "@/components/ui/8bit-input";

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

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="retro flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#888888]"
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
        // Native <select> (keeps the simple <option> children API) wrapped in the
        // same 8-bit pixel frame as the Input, so the auth form matches the rest.
        <div className="relative flex min-w-0 items-center border-y-[6px] border-foreground dark:border-ring">
          <select
            id={id}
            className="retro w-full min-w-0 cursor-pointer appearance-none rounded-none border-none bg-transparent px-3 py-2.5 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
            style={{ colorScheme: "dark" }}
            {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {(props as SelectFieldProps).children}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 text-[10px] text-muted-foreground"
          >
            ▾
          </span>
          <div
            className="pointer-events-none absolute inset-0 -mx-[6px] border-x-[6px] border-foreground dark:border-ring"
            aria-hidden="true"
          />
        </div>
      ) : (
        <Input
          id={id}
          disabled={locked}
          aria-invalid={!!error}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hint && !error && (
        <p className="retro text-[9px] uppercase tracking-wider text-[#555555]">
          {hint}
        </p>
      )}
      {error && (
        <p className="retro text-[10px] uppercase tracking-wider text-[#ef4444]">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
