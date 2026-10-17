import "@testing-library/jest-dom";
import {
  assertNotProductionSupabaseUrl,
  createProductionSupabaseNetworkGuard,
} from "./production-supabase-network-guard";

if (typeof globalThis.fetch !== "function") {
  throw new Error("Vitest requires fetch so the production-host network guard can be installed.");
}

globalThis.fetch = createProductionSupabaseNetworkGuard(globalThis.fetch.bind(globalThis));

const originalXhrOpen = window.XMLHttpRequest.prototype.open;
window.XMLHttpRequest.prototype.open = new Proxy(originalXhrOpen, {
  apply(target, thisArg, args: [string, string | URL, ...unknown[]]) {
    assertNotProductionSupabaseUrl(String(args[1]));
    return Reflect.apply(target, thisArg, args);
  },
});

const originalWebSocket = globalThis.WebSocket;
if (typeof originalWebSocket === "function") {
  globalThis.WebSocket = new Proxy(originalWebSocket, {
    construct(target, args: ConstructorParameters<typeof WebSocket>, newTarget) {
      assertNotProductionSupabaseUrl(String(args[0]));
      return Reflect.construct(target, args, newTarget);
    },
  });
}

if (typeof navigator.sendBeacon === "function") {
  const originalSendBeacon = navigator.sendBeacon.bind(navigator);
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: (url: string | URL, data?: BodyInit | null) => {
      assertNotProductionSupabaseUrl(String(url));
      return originalSendBeacon(url, data);
    },
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
