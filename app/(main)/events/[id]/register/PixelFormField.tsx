"use client";

import { Label } from "@/components/ui/8bit-label";
import type { FormFieldDef } from "@/lib/forms";

interface Props {
  field: FormFieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

const inputBase =
  "w-full bg-black border-2 border-white/15 px-4 py-3 text-xs font-mono text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#22c55e] transition-colors";

export function PixelFormField({ field, value, error, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="retro text-[9px] tracking-widest text-[#22c55e]">
        {field.label}
        {field.required && <span className="text-red-400"> *</span>}
      </Label>
      {field.description && (
        <p className="text-[11px] text-muted-foreground">{field.description}</p>
      )}

      {field.type === "paragraph" ? (
        <textarea
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} min-h-[120px] resize-none`}
        />
      ) : field.type === "dropdown" ? (
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} appearance-none`}
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "single_choice" ? (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-3 text-xs text-white"
            >
              <input
                type="radio"
                name={field.id}
                checked={value === o}
                onChange={() => onChange(o)}
                className="accent-[#22c55e]"
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === "multi_choice" ? (
        <div className="flex flex-col gap-2">
          {(field.options ?? []).map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            return (
              <label
                key={o}
                className="flex cursor-pointer items-center gap-3 text-xs text-white"
              >
                <input
                  type="checkbox"
                  checked={arr.includes(o)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...arr, o]
                        : arr.filter((v) => v !== o),
                    )
                  }
                  className="accent-[#22c55e]"
                />
                {o}
              </label>
            );
          })}
        </div>
      ) : (
        <input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "email"
                  ? "email"
                  : "text"
          }
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {error && <p className="retro text-[8px] text-red-400">{error}</p>}
    </div>
  );
}
