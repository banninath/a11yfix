"use client";

import { useEffect } from "react";

export default function VoiceShortcuts() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isFormControl =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      if (event.code === "Space") {
        if (!isFormControl) {
          event.preventDefault();
        }
        window.dispatchEvent(new CustomEvent("a11yfix:voice-toggle"));
      } else if (event.key === "Escape") {
        if (!isFormControl) {
          event.preventDefault();
        }
        window.dispatchEvent(new CustomEvent("a11yfix:voice-stop"));
      } else if (!isFormControl && event.key.toLowerCase() === "r") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent("a11yfix:voice-repeat"));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
