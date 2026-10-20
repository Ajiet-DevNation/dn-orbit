"use client";

import { Input } from "@/components/ui/8bit-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { Textarea } from "@/components/ui/8bit-textarea";
import type { FormFieldDef } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { FieldCard } from "./FieldCard";

interface Props {
  field: FormFieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}

// Choice rows: pixel-bordered tiles that fill purple when selected. The real
// radio/checkbox is kept (sr-only) for keyboard + a11y; the visible control is
// an 8-bit square mark (matching PixelCheckbox) instead of the round native one.
const choiceLabel =
  "flex min-h-11 cursor-pointer items-center gap-3 border-2 border-white/15 bg-[#0d0d0d] px-4 py-2.5 font-mono text-sm text-white transition-colors hover:border-brand/40 has-[:checked]:border-brand/70 has-[:checked]:bg-brand/[0.06]";

// Square pixel indicator for choice rows. `peer-focus-visible` lights it up when
// the (sr-only) input next to it is keyboard-focused.
function ChoiceMark({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center border-2 bg-black transition-colors peer-focus-visible:border-brand",
        checked ? "border-brand" : "border-white/30",
      )}
    >
      {checked && <span className="block size-2.5 bg-brand" />}
    </span>
  );
}

export function PixelFormField({ field, value, error, onChange }: Props) {
  // Choice groups have no single control for the label to point at.
  const id = `reg-${field.id}`;
  const single = !field.type.endsWith("_choice");
  return (
    <FieldCard
      htmlFor={single ? id : undefined}
      label={field.label}
      required={field.required}
      description={field.description ?? undefined}
      error={error}
    >
      {field.type === "paragraph" ? (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
        />
      ) : field.type === "dropdown" ? (
        <Select
          value={(value as string) ?? ""}
          onValueChange={(v) => onChange(v)}
        >
          <SelectTrigger id={id} aria-invalid={!!error}>
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
                className="peer sr-only"
              />
              <ChoiceMark checked={value === o} />
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
                  className="peer sr-only"
                />
                <ChoiceMark checked={arr.includes(o)} />
                {o}
              </label>
            );
          })}
        </div>
      ) : (
        <Input
          type={
            field.type === "number"
              ? "number"
              : field.type === "date"
                ? "date"
                : field.type === "email"
                  ? "email"
                  : "text"
          }
          id={id}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          onChange={(e) => onChange(e.target.value)}
          style={field.type === "date" ? { colorScheme: "dark" } : undefined}
        />
      )}
    </FieldCard>
  );
}
