"use client";

import { useState } from "react";
import { FaCode } from "react-icons/fa";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/8bit-command";
import { PixelCheck } from "@/components/ui/PixelIcons";
import {
  findTechName,
  MAX_TECH_ITEMS,
  normalizeTechName,
} from "@/lib/tech-name";
import { TECH_BY_NAME, TECH_STACK } from "./techStack";

interface TechStackSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
}

const CATALOGUE_NAMES = TECH_STACK.map((t) => t.name);

export function TechStackSelect({ value, onChange }: TechStackSelectProps) {
  const selected = new Set(value);
  const [query, setQuery] = useState("");

  const full = value.length >= MAX_TECH_ITEMS;
  const typed = normalizeTechName(query);
  const needle = typed.toLowerCase();
  // Plain substring match, filtered here rather than by cmdk's fuzzy scorer, so
  // the row order (and so what Enter picks) is predictable.
  const matches = needle
    ? TECH_STACK.filter((t) => t.name.toLowerCase().includes(needle))
    : TECH_STACK;
  // Offer the typed name as a custom entry unless it duplicates a listed or an
  // already-picked one, ignoring case ("react" is just React).
  const canAdd =
    !full &&
    typed !== "" &&
    findTechName(typed, [...CATALOGUE_NAMES, ...value]) === null;

  function toggle(name: string) {
    if (selected.has(name)) {
      onChange(value.filter((v) => v !== name));
    } else if (!full) {
      onChange([...value, name]);
    }
  }

  function addTyped() {
    if (!canAdd) return;
    onChange([...value, typed]);
    setQuery("");
  }

  // Leads when nothing in the list matches, so Enter adds it; otherwise it
  // trails, so Enter still picks the real entry while typing ("reac" → React).
  const addRow = canAdd && (
    <CommandItem
      value={`add:${typed}`}
      onSelect={addTyped}
      className="flex items-center gap-3 text-[11px] text-brand-light"
    >
      <FaCode className="size-4 shrink-0" />
      <span className="flex-1 break-all">+ ADD &ldquo;{typed}&rdquo;</span>
    </CommandItem>
  );

  return (
    <div className="space-y-5">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="space-y-3">
          <p className="retro text-[8px] tracking-widest text-muted-foreground">
            SELECTED ({value.length}/{MAX_TECH_ITEMS}) · CLICK TO REMOVE
          </p>
          <div className="flex flex-wrap gap-2.5">
            {value.map((name) => {
              // Custom entries have no catalogue icon; a generic one keeps the
              // chips uniform.
              const Icon = TECH_BY_NAME[name]?.Icon ?? FaCode;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(name)}
                  aria-label={`Remove ${name}`}
                  title="Remove"
                  className="group/chip retro flex h-9 items-center gap-2 border-2 border-brand/70 bg-brand/[0.06] px-3 text-[10px] leading-none text-white transition-colors hover:border-red-500 hover:bg-red-500/10"
                >
                  <Icon className="size-4 shrink-0 text-brand-light transition-colors group-hover/chip:text-red-400" />
                  <span>{name}</span>
                  <span
                    aria-hidden="true"
                    className="ml-0.5 grid size-4 place-items-center border border-brand/50 text-[9px] leading-none text-brand-light/80 transition-colors group-hover/chip:border-red-500 group-hover/chip:text-red-400"
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
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search, or type any tool to add it…"
        />
        <CommandList className="max-h-[220px]">
          <CommandEmpty>
            {typed !== "" && findTechName(typed, value) !== null
              ? "Already added."
              : full
                ? `Limit reached (${MAX_TECH_ITEMS}).`
                : "No match."}
          </CommandEmpty>
          <CommandGroup>
            {matches.length === 0 && addRow}
            {matches.map(({ name, Icon }) => {
              const isSel = selected.has(name);
              return (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => toggle(name)}
                  disabled={full && !isSel}
                  className="flex items-center gap-3 text-[11px]"
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{name}</span>
                  {isSel && <PixelCheck className="text-brand-light" />}
                </CommandItem>
              );
            })}
            {matches.length > 0 && addRow}
          </CommandGroup>
        </CommandList>
      </Command>
      {full && (
        <p className="retro text-[8px] leading-relaxed text-muted-foreground">
          {MAX_TECH_ITEMS} IS THE LIMIT · REMOVE ONE TO ADD ANOTHER
        </p>
      )}
    </div>
  );
}
