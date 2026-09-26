(() => {
  "use strict";

  const canonicalize = (value) => {
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) =>
        `${JSON.stringify(key)}:${canonicalize(value[key])}`
      ).join(",")}}`;
    }
    return JSON.stringify(value);
  };

  const hex = (bytes) =>
    Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

  const verify = async () => {
    const state = document.getElementById("receipt-state");
    const digest = document.getElementById("receipt-digest");
    try {
      const response = await fetch("session-receipt.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`receipt HTTP ${response.status}`);
      const receipt = await response.json();
      const computed = hex(await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(canonicalize(receipt.payload))
      ));
      const valid = computed === receipt.payload_sha256;
      state.classList.toggle("live", valid);
      state.classList.toggle("static", !valid);
      state.querySelector("strong").textContent = valid
        ? "Receipt payload verified"
        : "Receipt payload mismatch";
      state.querySelector("span").textContent = valid
        ? "The browser recomputed the canonical SHA-256 successfully."
        : "Do not rely on this receipt until its payload hash is corrected.";
      digest.textContent = computed;
      state.dataset.receiptValid = String(valid);
    } catch (error) {
      state.classList.add("static");
      state.querySelector("strong").textContent = "Receipt unavailable";
      state.querySelector("span").textContent = "The static evidence file could not be verified.";
      digest.textContent = "unavailable";
      state.dataset.receiptValid = "false";
      console.warn("Session receipt verification failed", error);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verify, { once: true });
  } else {
    verify();
  }
})();
