import { Label } from "@/components/ui/8bit-label";

// One Google-Forms-style question card: a bordered surface that highlights green
// while focused (focus-within), a pixel label with a red required marker, an
// optional helper line, the control, and an inline error. Shared by the built-in
// name/email/usn fields and the dynamic schema fields so every question looks
// identical.
export function FieldCard({
  label,
  required,
  description,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-2.5 border-2 bg-[#0a0a0a] p-5 transition-colors duration-200 focus-within:border-[#22c55e]/60 ${
        error ? "border-[#ef4444]/60" : "border-white/10"
      }`}
    >
      {/* Readable mono (not the pixel display face) — question labels are
          arbitrary sentences, so the pixel font made them hard to read. Bold +
          green keeps it clearly a form label, on-theme. */}
      <Label className="font-mono text-sm font-semibold leading-relaxed tracking-wide text-[#22c55e]">
        {label}
        {required && <span className="text-[#ef4444]"> *</span>}
      </Label>
      {description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p className="font-mono text-[11px] leading-relaxed text-[#ef4444]">
          {error}
        </p>
      )}
    </div>
  );
}
