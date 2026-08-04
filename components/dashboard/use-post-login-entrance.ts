"use client";

import { useEffect, useState } from "react";
import { AUTH_ENTRY_FLAG } from "@/lib/auth/entry-flag";

/**
 * True for the first paint after a successful login handoff.
 * Cleared immediately so revisiting the dashboard stays calm.
 */
export function usePostLoginEntrance(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTH_ENTRY_FLAG) === "1") {
        sessionStorage.removeItem(AUTH_ENTRY_FLAG);
        setActive(true);
      }
    } catch {
      // private mode / blocked storage: skip entrance
    }
  }, []);

  return active;
}
