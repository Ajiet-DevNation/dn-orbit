"use client";

import { PixelFormField } from "@/app/(main)/events/[id]/register/PixelFormField";
import {
  CHOICE_TYPES,
  FIELD_TYPE_LABELS,
  type FieldType,
  type FormFieldDef,
} from "@/lib/forms";

const ALL_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
const ctl = "bg-black border-2 border-white/15 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#22c55e]";

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
  const add = (type: FieldType) =>
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        type,
        label: "Untitled question",
        required: false,
        options: CHOICE_TYPES.includes(type) ? ["Option 1"] : undefined,
      },
    ]);

  return (
    <div className="flex flex-col gap-6">
      {value.map((f, idx) => (
        <div key={f.id} className="border-2 border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="retro text-[8px] text-zinc-500">{FIELD_TYPE_LABELS[f.type]}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => move(idx, -1)} className="retro border-2 border-white/15 px-2 py-1 text-[8px] text-white/70">▲</button>
              <button type="button" onClick={() => move(idx, 1)} className="retro border-2 border-white/15 px-2 py-1 text-[8px] text-white/70">▼</button>
              <button type="button" onClick={() => remove(f.id)} className="retro border-2 border-red-500/40 px-2 py-1 text-[8px] text-red-400">✕</button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input className={ctl} value={f.label} placeholder="Question label" onChange={(e) => update(f.id, { label: e.target.value })} />
            <select className={`${ctl} appearance-none`} value={f.type} onChange={(e) => {
              const type = e.target.value as FieldType;
              update(f.id, { type, options: CHOICE_TYPES.includes(type) ? (f.options ?? ["Option 1"]) : undefined });
            }}>
              {ALL_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
            </select>
            <input className={ctl} value={f.description ?? ""} placeholder="Help text (optional)" onChange={(e) => update(f.id, { description: e.target.value })} />
            <input className={ctl} value={f.placeholder ?? ""} placeholder="Placeholder (optional)" onChange={(e) => update(f.id, { placeholder: e.target.value })} />
          </div>
          {CHOICE_TYPES.includes(f.type) && (
            <div className="mt-3 flex flex-col gap-2">
              {(f.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex gap-2">
                  <input className={`${ctl} flex-1`} value={opt} onChange={(e) => {
                    const options = [...(f.options ?? [])];
                    options[oi] = e.target.value;
                    update(f.id, { options });
                  }} />
                  <button type="button" className="retro border-2 border-white/15 px-2 text-[8px] text-white/60" onClick={() => update(f.id, { options: (f.options ?? []).filter((_, k) => k !== oi) })}>✕</button>
                </div>
              ))}
              <button type="button" className="retro w-fit border-2 border-white/15 px-3 py-1 text-[8px] text-[#22c55e]" onClick={() => update(f.id, { options: [...(f.options ?? []), `Option ${(f.options?.length ?? 0) + 1}`] })}>+ ADD OPTION</button>
            </div>
          )}
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-[10px] text-white">
            <input type="checkbox" checked={f.required} onChange={(e) => update(f.id, { required: e.target.checked })} className="accent-[#22c55e]" />
            Required
          </label>
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((t) => (
          <button key={t} type="button" onClick={() => add(t)} className="retro border-2 border-[#22c55e]/40 px-3 py-2 text-[8px] text-[#22c55e] hover:bg-[#22c55e]/10">
            + {FIELD_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {value.length > 0 && (
        <details className="border-2 border-white/10 bg-black/40 p-4">
          <summary className="retro cursor-pointer text-[9px] text-[#22c55e]">LIVE PREVIEW</summary>
          <div className="mt-4 flex flex-col gap-5">
            {value.map((f) => (
              <PixelFormField key={f.id} field={f} value={undefined} onChange={() => {}} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
