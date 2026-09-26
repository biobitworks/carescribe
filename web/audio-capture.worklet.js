class CareScribeAudioCapture extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    const pcm = new Int16Array(channel.length);
    for (let index = 0; index < channel.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, channel[index]));
      pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
    this.port.postMessage({ type: "audio", pcm }, [pcm.buffer]);
    return true;
  }
}

registerProcessor("carescribe-audio-capture", CareScribeAudioCapture);
