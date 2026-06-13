"use client";

import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/8bit-command";
import { TECH_STACK, TECH_BY_NAME } from "./techStack";

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
        <div className="flex flex-wrap gap-3">
          {value.map((name) => {
            const tech = TECH_BY_NAME[name];
            const Icon = tech?.Icon;
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className="flex items-center gap-2 border-2 border-[#22c55e] px-2 py-1 text-[10px] text-white hover:border-red-500"
                title="Remove"
              >
                {Icon && <Icon className="size-3.5 text-[#22c55e]" />}
                {name}
                <span className="text-muted-foreground">×</span>
              </button>
            );
          })}
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
