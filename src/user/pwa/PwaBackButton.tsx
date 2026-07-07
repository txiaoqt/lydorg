import { ArrowLeft } from "lucide-react";
import { usePwaNavigation } from "./hooks/usePwaNavigation";

export function PwaBackButton({ fallback, label = "Back" }: { fallback: string; label?: string }) {
  const { back } = usePwaNavigation();
  return (
    <button type="button" className="pwa-back-button" onClick={() => back(fallback)}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </button>
  );
}

