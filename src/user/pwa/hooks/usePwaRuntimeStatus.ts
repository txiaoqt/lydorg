import { useCallback, useEffect, useRef, useState } from "react";

type UpdateState = "current" | "checking" | "available" | "unsupported" | "error";
type StandaloneNavigator = Navigator & { standalone?: boolean };

export function usePwaRuntimeStatus() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [updateState, setUpdateState] = useState<UpdateState>(
    typeof navigator !== "undefined" && "serviceWorker" in navigator ? "current" : "unsupported",
  );
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const updateOnlineState = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then((registration) => {
        registrationRef.current = registration;
        if (registration.waiting) setUpdateState("available");
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          installing?.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateState("available");
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      setUpdateState("unsupported");
      return;
    }
    setUpdateState("checking");
    try {
      const registration = registrationRef.current ?? await navigator.serviceWorker.ready;
      registrationRef.current = registration;
      await registration.update();
      setUpdateState(registration.waiting ? "available" : "current");
    } catch {
      setUpdateState("error");
    }
  }, []);

  const updateApp = useCallback(async () => {
    const registration = registrationRef.current ?? (
      "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null
    );
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }, []);

  return {
    online,
    updateState,
    installed:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as StandaloneNavigator).standalone === true,
    checkForUpdates,
    updateApp,
  };
}
