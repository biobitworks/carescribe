(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.CareScribeCustody = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FCG_EDGE_TYPES = Object.freeze([
    "SYMPTOM", "QUESTION", "ANSWER", "MEDICATION", "TEST", "DECISION",
    "FOLLOW_UP", "CONCERN", "CONTRADICTION", "UNRESOLVED", "CAREGIVER_CORRECTION",
  ]);
  const PRESERVED_VALUES = Object.freeze([
    "UNKNOWN", "NOT_ANSWERED", "UNCERTAIN", "NEEDS_REVIEW",
  ]);
  const edgeKinds = new Set(FCG_EDGE_TYPES);
  const encoder = new TextEncoder();

  function canonicalStringify(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
      return JSON.stringify(value);
    }
    if (typeof value === "number") {
      if (!Number.isInteger(value)) throw new TypeError("canonical JSON only allows integers");
      return String(value);
    }
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => {
        if (value[key] === undefined) throw new TypeError("undefined is not canonical JSON");
        return `${JSON.stringify(key)}:${canonicalStringify(value[key])}`;
      }).join(",")}}`;
    }
    throw new TypeError(`unsupported canonical JSON value: ${typeof value}`);
  }

  async function sha256Bytes(bytes) {
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      throw new Error("Web Crypto SHA-256 is required");
    }
    return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes));
  }

  function concat(...parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  function hex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function unhex(value) {
    if (!/^[0-9a-fA-F]{64}$/.test(value)) {
      throw new TypeError("MMR item id must be a 32-byte SHA-256 hex digest");
    }
    return Uint8Array.from(value.match(/../g), (pair) => parseInt(pair, 16));
  }

  function payloadOf(input, predecessorId) {
    const clinicalRelevance = input.clinicalRelevance ?? input.clinical_relevance;
    const payload = {
      timestamp: input.timestamp,
      speaker: input.speaker,
      role: input.role,
      statement: input.statement,
      observation: input.observation,
      confidence: input.confidence,
      source: input.source,
      clinical_relevance: clinicalRelevance,
      status: input.status,
    };
    const predecessor = predecessorId ?? input.predecessorId ?? input.predecessor_id;
    if (predecessor != null) payload.predecessor_id = predecessor;
    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined) throw new TypeError(`missing FCO field: ${key}`);
    }
    return payload;
  }

  function publicFCO(payload, id) {
    const result = {
      id, hash: id,
      timestamp: payload.timestamp,
      speaker: payload.speaker,
      role: payload.role,
      statement: payload.statement,
      observation: payload.observation,
      confidence: payload.confidence,
      source: payload.source,
      clinicalRelevance: payload.clinical_relevance,
      status: payload.status,
    };
    if (payload.predecessor_id != null) result.predecessorId = payload.predecessor_id;
    return Object.freeze(result);
  }

  async function createFCO(input, predecessorId) {
    const payload = payloadOf(input, predecessorId);
    const id = hex(await sha256Bytes(encoder.encode(canonicalStringify(payload))));
    return publicFCO(payload, id);
  }

  async function verifyFCO(fco) {
    const payload = payloadOf(fco);
    const expected = hex(await sha256Bytes(encoder.encode(canonicalStringify(payload))));
    return fco.id === expected && fco.hash === expected;
  }

  function createEdge(source, target, kind) {
    if (!edgeKinds.has(kind)) throw new TypeError(`unsupported FCG edge kind: ${kind}`);
    return Object.freeze({ source, target, kind });
  }

  async function hashNode(prefix, ...parts) {
    return sha256Bytes(concat(Uint8Array.of(prefix), ...parts));
  }

  class MMRAccumulator {
    constructor() {
      this._peaks = [];
      this.size = 0;
      this.root = null;
    }

    static async from(ids) {
      const result = new MMRAccumulator();
      for (const id of ids) await result.append(id);
      return result;
    }

    get peaks() {
      return this._peaks.map((entry) => hex(entry.value));
    }

    async _calculateRoot() {
      if (!this._peaks.length) return hex(await hashNode(3));
      let bag = this._peaks.at(-1).value;
      for (let i = this._peaks.length - 2; i >= 0; i -= 1) {
        bag = await hashNode(2, this._peaks[i].value, bag);
      }
      return hex(bag);
    }

    async append(itemId) {
      let height = 0;
      let node = await hashNode(0, unhex(itemId));
      while (this._peaks.length && this._peaks.at(-1).height === height) {
        const left = this._peaks.pop().value;
        node = await hashNode(1, left, node);
        height += 1;
      }
      this._peaks.push({ height, value: node });
      this.size += 1;
      this.root = await this._calculateRoot();
      return this.root;
    }
  }

  class CustodyLedger {
    constructor() {
      this.fcos = [];
      this.edges = [];
      this.mmr = new MMRAccumulator();
      this._byId = new Map();
    }

    get root() { return this.mmr.root; }

    async appendFCO(input) {
      const fco = input.id ? input : await createFCO(input);
      if (!(await verifyFCO(fco))) throw new TypeError("FCO integrity verification failed");
      if (this._byId.has(fco.id)) throw new TypeError(`FCO already exists: ${fco.id}`);
      this.fcos.push(fco);
      this._byId.set(fco.id, fco);
      await this.mmr.append(fco.id);
      return fco;
    }

    appendEdge(edge) {
      const checked = createEdge(edge.source, edge.target, edge.kind);
      if (!this._byId.has(checked.source) || !this._byId.has(checked.target)) {
        throw new TypeError("FCG edge endpoints must refer to appended FCOs");
      }
      this.edges.push(checked);
      return checked;
    }

    async correct(predecessorId, fields) {
      if (!this._byId.has(predecessorId)) throw new TypeError(`unknown FCO: ${predecessorId}`);
      const successor = await createFCO(fields, predecessorId);
      await this.appendFCO(successor);
      this.appendEdge(createEdge(predecessorId, successor.id, "CAREGIVER_CORRECTION"));
      return successor;
    }
  }

  return Object.freeze({
    FCG_EDGE_TYPES, PRESERVED_VALUES, canonicalStringify, createFCO, verifyFCO,
    createEdge, MMRAccumulator, CustodyLedger,
  });
});
