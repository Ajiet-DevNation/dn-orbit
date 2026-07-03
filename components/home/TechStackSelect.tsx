"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/8bit-command";
import { TECH_BY_NAME, TECH_STACK } from "./techStack";

interface TechStackSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export function TechStackSelect({ value, onChange }: TechStackSelectProps) {
  const selected = new Set(value);

  function toggle(name: string) {
    if (selected.has(name)) {
      onChange(value.filter((v) => v !== name));
    } else {
      onChange([...value, name]);
    }
  }

  return (
    <div className="space-y-5">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="space-y-3">
          <p className="retro text-[8px] tracking-widest text-muted-foreground">
            SELECTED ({value.length}) · CLICK TO REMOVE
          </p>
          <div className="flex flex-wrap gap-2.5">
            {value.map((name) => {
              const tech = TECH_BY_NAME[name];
              const Icon = tech?.Icon;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  aria-label={`Remove ${name}`}
                  title="Remove"
                  className="group/chip retro flex h-9 items-center gap-2 border-2 border-[#22c55e]/70 bg-[#22c55e]/[0.06] px-3 text-[10px] leading-none text-white transition-colors hover:border-red-500 hover:bg-red-500/10"
                >
                  {Icon && (
                    <Icon className="size-4 shrink-0 text-[#22c55e] transition-colors group-hover/chip:text-red-400" />
                  )}
                  <span>{name}</span>
                  <span
                    aria-hidden="true"
                    className="ml-0.5 grid size-4 place-items-center border border-[#22c55e]/50 text-[9px] leading-none text-[#22c55e]/80 transition-colors group-hover/chip:border-red-500 group-hover/chip:text-red-400"
                  >
                    ×
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Searchable list */}
      <Command>
        <CommandInput placeholder="Search a language or tool…" />
        <CommandList className="max-h-[220px]">
          <CommandEmpty>No match.</CommandEmpty>
          <CommandGroup>
            {TECH_STACK.map(({ name, Icon }) => {
              const isSel = selected.has(name);
              return (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => toggle(name)}
                  className="flex items-center gap-3 text-[11px]"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{name}</span>
                  {isSel && <span className="text-[#22c55e]">✓</span>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
