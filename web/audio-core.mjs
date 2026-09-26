function floatToPcm(sample) {
  const bounded = Math.max(-1, Math.min(1, Number(sample) || 0));
  return Math.round(bounded < 0 ? bounded * 0x8000 : bounded * 0x7fff);
}

export class StreamingPcmEncoder {
  constructor({ inputRate, outputRate = 16_000, frameSamples = 640 }) {
    if (!(inputRate > 0) || !(outputRate > 0) || !(frameSamples > 0)) {
      throw new Error("Audio rates and frame size must be positive.");
    }
    this.inputRate = inputRate;
    this.outputRate = outputRate;
    this.frameSamples = frameSamples;
    this.resampleAccumulator = 0;
    this.pending = [];
  }

  takeFrames() {
    const frames = [];
    while (this.pending.length >= this.frameSamples) {
      frames.push(Int16Array.from(this.pending.splice(0, this.frameSamples)));
    }
    return frames;
  }

  push(samples) {
    for (const sample of samples) {
      this.resampleAccumulator += this.outputRate;
      while (this.resampleAccumulator >= this.inputRate) {
        this.pending.push(floatToPcm(sample));
        this.resampleAccumulator -= this.inputRate;
      }
    }
    return this.takeFrames();
  }

  trailingSilence(durationMs = 800) {
    const sampleCount = Math.round(this.outputRate * durationMs / 1000);
    for (let index = 0; index < sampleCount; index += 1) this.pending.push(0);
    if (this.pending.length % this.frameSamples) {
      const padding = this.frameSamples - (this.pending.length % this.frameSamples);
      for (let index = 0; index < padding; index += 1) this.pending.push(0);
    }
    return this.takeFrames();
  }
}
