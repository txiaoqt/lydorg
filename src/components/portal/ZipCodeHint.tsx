import { validateZipCode } from "@/lib/organization-profile-domain";
import { cn } from "@/lib/utils";

/** Shows the allowed Pasig ZIP range under the field, and the error once a full 4-digit ZIP is out of range. */
export function ZipCodeHint({ value }: { value?: string | null }) {
  const error = value?.trim().length === 4 ? validateZipCode(value) : null;
  return (
    <p role={error ? "alert" : undefined} className={cn("text-[11px] leading-snug", error ? "text-red-500" : "text-muted-foreground")}>
      {error ?? "Pasig City ZIP codes only (1600 to 1612)."}
    </p>
  );
}
