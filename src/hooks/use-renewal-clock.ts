import { useEffect, useState } from "react";

export const getRenewalClock = (expiresAt: string, now = Date.now()) => {
  const expiryTime = new Date(expiresAt).getTime();
  const totalSeconds = Number.isNaN(expiryTime)
    ? 0
    : Math.max(0, Math.floor((expiryTime - now) / 1000));

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    isDue: totalSeconds <= 0,
  };
};

export const useRenewalClock = (expiresAt: string) => {
  const [clock, setClock] = useState(() => getRenewalClock(expiresAt));

  useEffect(() => {
    setClock(getRenewalClock(expiresAt));
    const timer = window.setInterval(() => {
      setClock(getRenewalClock(expiresAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  return clock;
};
