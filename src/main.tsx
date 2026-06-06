import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { IS_ADMIN_SURFACE } from "./lib/deployment-surface";
import "./index.css";

if (!IS_ADMIN_SURFACE) {
  const manifestLink = document.createElement("link");
  manifestLink.rel = "manifest";
  manifestLink.href = "/manifest.webmanifest";
  document.head.appendChild(manifestLink);
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=5").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
