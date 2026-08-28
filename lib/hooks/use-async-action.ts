"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Tracks async work with a reliable busy flag. Unlike `useTransition` with
 * async callbacks, `pending` stays true until the promise settles.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    try {
      await fn();
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run };
}
