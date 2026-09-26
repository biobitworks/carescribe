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
  const decodeBase64 = (value) =>
    Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  const mount = () => {
    const footer = document.querySelector("body > footer") ||
      document.body.appendChild(document.createElement("footer"));
    const proof = document.createElement("span");
    proof.className = "release-proof";
    proof.textContent = "Release signature · verifying…";
    footer.appendChild(proof);
    return proof;
  };
  const verify = async () => {
    const proof = mount();
    try {
      const response = await fetch("release-receipt.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`receipt HTTP ${response.status}`);
      const receipt = await response.json();
      const key = await crypto.subtle.importKey(
        "spki", decodeBase64(receipt.signature.public_key_spki_base64),
        { name: "Ed25519" }, false, ["verify"]
      );
      const valid = await crypto.subtle.verify(
        { name: "Ed25519" }, key, decodeBase64(receipt.signature.value_base64),
        new TextEncoder().encode(canonicalize(receipt.payload))
      );
      const root = receipt.payload.fcg.node.previous_mmr_root;
      const issued = receipt.payload.issued_at.replace("T", " ").replace("Z", " UTC");
      proof.replaceChildren(
        document.createTextNode(`Release ${issued} · Ed25519 signature ${valid ? "valid" : "INVALID"} · FCG root ${root.slice(0, 12)}… · `),
        Object.assign(document.createElement("a"), {
          href: "release-receipt.json", textContent: "receipt"
        })
      );
      proof.dataset.signatureValid = String(valid);
    } catch (error) {
      proof.textContent = "Release signature unavailable · see receipt";
      proof.dataset.signatureValid = "false";
      console.warn("Release receipt verification failed", error);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verify, { once: true });
  } else {
    verify();
  }
})();
