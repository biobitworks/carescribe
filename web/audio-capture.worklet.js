import { StreamingPcmEncoder } from "./audio-core.mjs";

class CareScribeAudioCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.encoder = new StreamingPcmEncoder({
      inputRate: sampleRate,
      outputRate: 16_000,
      frameSamples: 640,
    });
  }

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const pcm of this.encoder.push(channel)) {
      this.port.postMessage({ type: "audio", pcm }, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("carescribe-audio-capture", CareScribeAudioCapture);
