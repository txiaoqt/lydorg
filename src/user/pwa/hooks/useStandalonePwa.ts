import { useEffect, useState } from "react";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const detectStandalone = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
};

export function useStandalonePwa() {
  const [standalone, setStandalone] = useState(detectStandalone);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const fullscreenMode = window.matchMedia("(display-mode: fullscreen)");
    const update = () => setStandalone(detectStandalone());
    update();
    displayMode.addEventListener?.("change", update);
    fullscreenMode.addEventListener?.("change", update);
    return () => {
      displayMode.removeEventListener?.("change", update);
      fullscreenMode.removeEventListener?.("change", update);
    };
  }, []);

  return standalone;
}
