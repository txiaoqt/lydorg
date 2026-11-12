import { useEffect, useState } from "react";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

// Not "display-mode: fullscreen": a normal browser in F11 matches it, and the manifest installs as standalone.
const detectStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  );
};

export function useStandalonePwa() {
  const [standalone, setStandalone] = useState(detectStandalone);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const update = () => setStandalone(detectStandalone());
    update();
    displayMode.addEventListener?.("change", update);
    return () => {
      displayMode.removeEventListener?.("change", update);
    };
  }, []);

  return standalone;
}
