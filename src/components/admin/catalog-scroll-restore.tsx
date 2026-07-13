"use client";

import { useEffect } from "react";

export function CatalogScrollRestore() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#device-") && !hash.startsWith("#tool-")) return;

    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return null;
}
