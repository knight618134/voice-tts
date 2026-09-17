const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const CACHE_LIMIT = 12;

function audioToBlob(rawAudio) {
  if (typeof rawAudio?.toBlob === 'function') return rawAudio.toBlob();
  const samples = rawAudio?.audio ?? rawAudio?.data;
  const sampleRate = rawAudio?.sampling_rate ?? rawAudio?.sample_rate ?? 24000;
  if (!samples) throw new Error('Kokoro returned an unsupported audio object.');
  return new Blob([encodeWav(samples, sampleRate)], { type: 'audio/wav' });
}

function encodeWav(samples, sampleRate) {
  const source = samples instanceof Float32Array ? samples : Float32Array.from(samples);
  const buffer = new ArrayBuffer(44 + source.length * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + source.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, source.length * 2, true);
  source.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff, true);
  });
  return buffer;
}

export class KokoroTtsEngine {
  constructor({ onStatus = () => {} } = {}) {
    this.onStatus = onStatus;
    this.tts = null;
    this.loadPromise = null;
    this.audio = null;
    this.audioElement = null;
    this.activeUrl = null;
    this.cache = new Map();
    this.cancelled = false;
  }

  async init() {
    if (this.tts) return this;
    if (!this.loadPromise) {
      this.loadPromise = this.loadModel();
    }
    try {
      await this.loadPromise;
      return this;
    } catch (error) {
      this.loadPromise = null;
      throw error;
    }
  }

  async loadModel() {
    this.onStatus({ key: 'loading', label: 'Loading model', detail: 'Downloading Kokoro WASM model', progress: 0 });
    const { KokoroTTS } = await import('kokoro-js');
    this.tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (progress) => {
        const raw = Number(progress?.progress);
        const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : undefined;
        const detail = progress?.file ? `Downloading ${progress.file}` : 'Preparing local model';
        this.onStatus({ key: 'loading', label: 'Loading model', detail, progress: percent });
      },
    });
    this.onStatus({ key: 'ready', label: 'Kokoro ready', detail: 'WASM + q8' });
  }

  isReady() {
    return Boolean(this.tts);
  }

  getVoices() {
    return this.tts?.list_voices?.() ?? [];
  }

  getAudioElement() {
    if (this.audioElement || typeof document === 'undefined') return this.audioElement;
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.style.display = 'none';
    document.body?.appendChild(audio);
    this.audioElement = audio;
    return audio;
  }

  prepareForPlayback() {
    // iOS Safari can reject audio.play() if the first play happens after an
    // async model download. Start a tiny muted WAV during the Play click so
    // the same persistent media element is unlocked before awaiting Kokoro.
    const audio = this.getAudioElement();
    if (!audio) return;
    const unlockUrl = URL.createObjectURL(new Blob([encodeWav(new Float32Array(240), 24000)], { type: 'audio/wav' }));
    audio.muted = true;
    audio.src = unlockUrl;
    const cleanup = () => {
      if (audio.src === unlockUrl) {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
        audio.muted = false;
      }
      URL.revokeObjectURL(unlockUrl);
    };
    try {
      Promise.resolve(audio.play()).then(cleanup, cleanup);
    } catch {
      cleanup();
    }
  }

  cacheKey(text, voice, speed) {
    return JSON.stringify([text, voice, Number(speed).toFixed(2)]);
  }

  touchCache(key, entry) {
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  addToCache(key, blob) {
    const url = URL.createObjectURL(blob);
    this.cache.set(key, { url, blob });
    while (this.cache.size > CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value;
      const oldest = this.cache.get(oldestKey);
      if (oldest?.url) URL.revokeObjectURL(oldest.url);
      this.cache.delete(oldestKey);
    }
    return url;
  }

  async getAudioUrl(text, voice, speed) {
    const key = this.cacheKey(text, voice, speed);
    const cached = this.cache.get(key);
    if (cached) {
      this.touchCache(key, cached);
      return cached.url;
    }
    this.onStatus({ key: 'generating', label: 'Generating audio', detail: 'Creating local speech' });
    const rawAudio = await this.tts.generate(text, { voice, speed: Number(speed) || 1 });
    return this.addToCache(key, await audioToBlob(rawAudio));
  }

  async speak(text, { voiceName = 'af_heart', rate = 1 } = {}) {
    await this.init();
    this.stop();
    this.cancelled = false;
    const url = await this.getAudioUrl(text, voiceName, rate);
    const audio = this.getAudioElement() || new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.src = url;
    audio.load();
    this.audio = audio;
    this.activeUrl = url;
    this.onStatus({ key: 'playing', label: 'Playing', detail: 'Kokoro local voice' });

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        this.audio = null;
        this.activeUrl = null;
        if (!this.cancelled) resolve();
      };
      audio.onerror = () => {
        this.audio = null;
        this.activeUrl = null;
        reject(new Error('The generated audio could not be played.'));
      };
      Promise.resolve(audio.play()).catch((error) => {
        this.audio = null;
        this.activeUrl = null;
        reject(error);
      });
    });
  }

  pause() {
    this.audio?.pause();
    this.onStatus({ key: 'paused', label: 'Paused' });
  }

  resume() {
    if (!this.audio) return;
    this.audio.play().catch(() => {
      this.onStatus({ key: 'error', label: 'Audio could not resume', detail: 'Try Play again.' });
    });
    this.onStatus({ key: 'playing', label: 'Playing', detail: 'Kokoro local voice' });
  }

  stop() {
    this.cancelled = true;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    // Cached URLs stay alive for reuse. clearCache() revokes every cached URL.
    this.activeUrl = null;
    this.onStatus({ key: 'stopped', label: 'Stopped' });
  }

  clearCache() {
    for (const entry of this.cache.values()) URL.revokeObjectURL(entry.url);
    this.cache.clear();
  }
}

export { MODEL_ID, CACHE_LIMIT };
