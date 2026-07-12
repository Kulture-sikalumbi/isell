let lockCount = 0;

/** Reference-counted body scroll lock — safe when multiple overlays compete. */
export function acquireBodyScrollLock(): () => void {
  if (typeof document === "undefined") {
    return () => {};
  }

  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = "hidden";
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = "";
    }
  };
}

/** Clears any stuck scroll lock — use sparingly after route changes. */
export function releaseAllBodyScrollLocks() {
  lockCount = 0;
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
}
