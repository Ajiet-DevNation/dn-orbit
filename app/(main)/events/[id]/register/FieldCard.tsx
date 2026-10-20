import { FIELD_ERROR } from "@/components/ui/8bit-input";
import { Label } from "@/components/ui/8bit-label";

// One Google-Forms-style question card: a bordered surface that highlights purple
// while focused (focus-within), a pixel label with a purple required marker, an
// optional helper line, the control, and an inline error. Shared by the built-in
// name/email/usn fields and the dynamic schema fields so every question looks
// identical.
export function FieldCard({
  htmlFor,
  label,
  required,
  description,
  error,
  children,
}: {
  /** id of the control, so clicking the label focuses it. */
  htmlFor?: string;
  label: string;
  required?: boolean;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-3 border-2 bg-[#0a0a0a] p-5 transition-colors duration-200 focus-within:border-brand/60 ${
        error ? "border-[#ef4444]/60" : "border-white/10"
      }`}
    >
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-brand-light">*</span>}
      </Label>
      {description && (
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
      {error && <p className={FIELD_ERROR}>{error}</p>}
    </div>
  );
}
