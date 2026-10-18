import { useEffect, useId, useRef, useState } from "react";
import { BadgeCheck, Download, Loader2 } from "lucide-react";
import { buildLiquidationCertificate, type LiquidationCertificateInput } from "@/lib/liquidation-certificate";

export function LiquidationCertificateNotice(input: LiquidationCertificateInput) {
  const result = buildLiquidationCertificate(input);
  const certificate = result.available ? result.certificate : null;
  const scope = JSON.stringify(certificate);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const mounted = useRef(true);
  const operation = useRef(0);
  const busy = useRef(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");
  const messageId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current += 1; };
  }, []);
  useEffect(() => {
    operation.current += 1;
    busy.current = false;
    setPreparing(false);
    setError("");
  }, [scope]);

  if (input.report.status !== "completed_liquidated") return null;
  const message = error || (result.available === false ? result.reason : "");

  const download = async () => {
    if (!certificate || busy.current) return;
    busy.current = true;
    const thisOperation = ++operation.current;
    const stillCurrent = () => mounted.current && operation.current === thisOperation && currentScope.current === scope;
    setPreparing(true);
    setError("");
    try {
      const { generateLiquidationCertificatePdf } = await import("@/lib/liquidation-certificate-pdf");
      if (!stillCurrent()) return;
      const pdf = await generateLiquidationCertificatePdf(certificate);
      // A closed drawer, changed status or account switch must cancel the pending download.
      if (stillCurrent()) pdf.save(certificate.filename);
    } catch {
      if (stillCurrent()) setError("Your certificate could not be prepared. Please try downloading it again. If the problem continues, contact PCYDO.");
    } finally {
      if (stillCurrent()) {
        busy.current = false;
        setPreparing(false);
      }
    }
  };

  return (
    <section aria-label="Liquidation certificate">
      <button
        type="button"
        onClick={() => void download()}
        disabled={!certificate || preparing}
        aria-label="Download certificate of budget liquidation"
        aria-busy={preparing}
        aria-describedby={message ? messageId : undefined}
        className="flex w-full items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-default disabled:hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50 dark:hover:bg-emerald-950/70 dark:disabled:hover:bg-emerald-950/40"
      >
        <BadgeCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-relaxed">Congratulations! Your budget has been successfully liquidated.</span>
          <span className="mt-1 block text-sm leading-relaxed text-emerald-900 dark:text-emerald-100" aria-live="polite">
            {preparing ? "Preparing your certificate…" : "Download your Certificate of Budget Liquidation for your records."}
          </span>
        </span>
        {preparing ? <Loader2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <Download aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />}
      </button>
      {message && <p id={messageId} role="alert" className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>}
    </section>
  );
}
