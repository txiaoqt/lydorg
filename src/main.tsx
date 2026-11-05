import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { IS_ADMIN_SURFACE } from "./lib/deployment-surface";
// Fonts are bundled with the site so visitors' browsers don't contact Google.
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/300.css";
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./index.css";

if (!IS_ADMIN_SURFACE) {
  const manifestLink = document.createElement("link");
  manifestLink.rel = "manifest";
  manifestLink.href = "/manifest.webmanifest";
  document.head.appendChild(manifestLink);
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js?v=13").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
