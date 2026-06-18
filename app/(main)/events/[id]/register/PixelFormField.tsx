"use client";

import { Input } from "@/components/ui/8bit-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import type { FormFieldDef } from "@/lib/forms";
import { FieldCard } from "./FieldCard";

interface Props {
  field: FormFieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

// Choice rows: pixel-bordered tiles that fill green when selected. Native
// radio/checkbox kept inside for behaviour, accent-coloured to match.
const choiceLabel =
  "flex cursor-pointer items-center gap-3 border-2 border-white/15 bg-[#0d0d0d] px-4 py-3 text-sm text-white transition-colors hover:border-[#22c55e]/40 has-[:checked]:border-[#22c55e]/70 has-[:checked]:bg-[#22c55e]/[0.06]";

export function PixelFormField({ field, value, error, onChange }: Props) {
  return (
    <FieldCard
      label={field.label}
      required={field.required}
      description={field.description ?? undefined}
      error={error}
    >
      {field.type === "paragraph" ? (
        // Multiline pixel-frame (same 8-bit border as the Input), readable mono.
        <div className="relative flex border-y-[6px] border-foreground dark:border-ring">
          <textarea
            value={(value as string) ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className="min-h-[120px] w-full resize-y rounded-none bg-transparent px-3 py-2.5 font-mono text-sm leading-relaxed text-white outline-none placeholder:text-zinc-600"
          />
          <div
            className="pointer-events-none absolute inset-0 -mx-[6px] border-x-[6px] border-foreground dark:border-ring"
            aria-hidden="true"
          />
        </div>
      ) : field.type === "dropdown" ? (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent className="z-[200] dark">
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "single_choice" ? (
        <div className="flex flex-col gap-2.5">
          {(field.options ?? []).map((o) => (
            <label key={o} className={choiceLabel}>
              <input
                type="radio"
                name={field.id}
                checked={value === o}
                onChange={() => onChange(o)}
                className="size-4 accent-[#22c55e]"
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === "multi_choice" ? (
        <div className="flex flex-col gap-2.5">
          {(field.options ?? []).map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            return (
              <label key={o} className={choiceLabel}>
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
                  className="size-4 accent-[#22c55e]"
                />
                {o}
              </label>
            );
          })}
        </div>
      ) : (
        <Input
          font="normal"
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
          style={field.type === "date" ? { colorScheme: "dark" } : undefined}
        />
      )}
    </FieldCard>
  );
}
