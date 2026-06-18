"use client";

import { PixelFormField } from "@/app/(main)/events/[id]/register/PixelFormField";
import { Button } from "@/components/ui/8bit-button";
import { Input } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";
import { PixelCheckbox } from "@/components/ui/PixelCheckbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import {
  CHOICE_TYPES,
  FIELD_TYPE_LABELS,
  type FieldType,
  type FormFieldDef,
} from "@/lib/forms";
import { cn } from "@/lib/utils";

const ALL_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];

// Small square pixel control used for reorder / delete on each question.
function IconBtn({
  children,
  danger,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "retro flex size-7 items-center justify-center border-2 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-25",
        danger
          ? "border-[#ef4444]/50 text-[#ef4444] hover:bg-[#ef4444] hover:text-black"
          : "border-white/25 text-white/70 hover:border-[#22c55e] hover:text-[#22c55e]"
      )}
    >
      {children}
    </button>
  );
}

export function FormBuilder({
  value,
  onChange,
}: {
  value: FormFieldDef[];
  onChange: (next: FormFieldDef[]) => void;
}) {
  const update = (id: string, patch: Partial<FormFieldDef>) =>
    onChange(value.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: string) => onChange(value.filter((f) => f.id !== id));
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };
  const add = () =>
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        type: "short_text",
        label: "",
        required: false,
      },
    ]);

  return (
    <div className="flex flex-col gap-5">
      {value.length === 0 && (
        <div className="border-2 border-dashed border-white/15 bg-black/30 p-6 text-center">
          <p className="retro text-[9px] leading-relaxed text-muted-foreground">
            NO CUSTOM QUESTIONS YET — ADD ONE BELOW.
          </p>
        </div>
      )}

      {value.map((f, idx) => {
        const isChoice = CHOICE_TYPES.includes(f.type);
        return (
          <div
            key={f.id}
            className="flex flex-col gap-4 border-2 border-white/15 bg-black/30 p-4"
          >
            {/* Card header: index + reorder / delete */}
            <div className="flex items-center justify-between gap-2">
              <span className="retro text-[9px] tracking-widest text-[#22c55e]">
                QUESTION {idx + 1}
              </span>
              <div className="flex gap-2">
                <IconBtn
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move question up"
                >
                  ▲
                </IconBtn>
                <IconBtn
                  onClick={() => move(idx, 1)}
                  disabled={idx === value.length - 1}
                  aria-label="Move question down"
                >
                  ▼
                </IconBtn>
                <IconBtn
                  danger
                  onClick={() => remove(f.id)}
                  aria-label="Delete question"
                >
                  ✕
                </IconBtn>
              </div>
            </div>

            {/* Label + type */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-[9px]">QUESTION *</Label>
                <Input
                  value={f.label}
                  placeholder="e.g. T-shirt size"
                  onChange={(e) => update(f.id, { label: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-[9px]">TYPE</Label>
                <Select
                  value={f.type}
                  onValueChange={(type) =>
                    update(f.id, {
                      type: type as FieldType,
                      options: CHOICE_TYPES.includes(type as FieldType)
                        ? (f.options ?? ["Option 1"])
                        : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200] dark">
                    {ALL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FIELD_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Help text + placeholder (placeholder only for free-text inputs) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-[9px]">HELP TEXT</Label>
                <Input
                  value={f.description ?? ""}
                  placeholder="Optional"
                  onChange={(e) => update(f.id, { description: e.target.value })}
                />
              </div>
              {!isChoice && (
                <div className="grid gap-2">
                  <Label className="text-[9px]">PLACEHOLDER</Label>
                  <Input
                    value={f.placeholder ?? ""}
                    placeholder="Optional"
                    onChange={(e) =>
                      update(f.id, { placeholder: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            {/* Options editor for choice-style fields */}
            {isChoice && (
              <div className="flex flex-col gap-2.5">
                <Label className="text-[9px]">OPTIONS</Label>
                {(f.options ?? []).map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-3">
                    <Input
                      className="flex-1"
                      value={opt}
                      placeholder={`Option ${oi + 1}`}
                      onChange={(e) => {
                        const options = [...(f.options ?? [])];
                        options[oi] = e.target.value;
                        update(f.id, { options });
                      }}
                    />
                    <IconBtn
                      danger
                      disabled={(f.options ?? []).length <= 1}
                      onClick={() =>
                        update(f.id, {
                          options: (f.options ?? []).filter((_, k) => k !== oi),
                        })
                      }
                      aria-label="Remove option"
                    >
                      ✕
                    </IconBtn>
                  </div>
                ))}
                <button
                  type="button"
                  className="retro w-fit border-2 border-[#22c55e]/50 px-3 py-1.5 text-[8px] tracking-widest text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black"
                  onClick={() =>
                    update(f.id, {
                      options: [
                        ...(f.options ?? []),
                        `Option ${(f.options?.length ?? 0) + 1}`,
                      ],
                    })
                  }
                >
                  + ADD OPTION
                </button>
              </div>
            )}

            {/* Required toggle — checkbox + label as siblings (no nested button) */}
            <div className="flex w-fit items-center gap-2.5">
              <PixelCheckbox
                checked={f.required}
                onChange={(next) => update(f.id, { required: next })}
                aria-label="Required question"
              />
              <button
                type="button"
                onClick={() => update(f.id, { required: !f.required })}
                className="retro cursor-pointer text-[9px] tracking-widest text-white/80 hover:text-white"
              >
                REQUIRED
              </button>
            </div>
          </div>
        );
      })}

      <Button
        type="button"
        onClick={add}
        className="w-fit text-[9px] !bg-[#22c55e] !text-black hover:!bg-[#16a34a]"
      >
        + ADD QUESTION
      </Button>

      {value.length > 0 && (
        <details className="border-2 border-white/15 bg-black/30 p-4">
          <summary className="retro cursor-pointer text-[9px] tracking-widest text-[#22c55e]">
            LIVE PREVIEW
          </summary>
          <div className="mt-4 flex flex-col gap-5">
            {value.map((f) => (
              <PixelFormField
                key={f.id}
                field={f}
                value={undefined}
                onChange={() => {}}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
