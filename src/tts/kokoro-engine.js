const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const CACHE_LIMIT = 12;

export class KokoroAudioNotEnabledError extends Error {
  constructor(message = 'Kokoro audio is not enabled. Tap Enable Kokoro Audio first.') {
    super(message);
    this.name = 'NotAllowedError';
    this.code = 'KOKORO_AUDIO_NOT_ENABLED';
  }
}

export function isKokoroAudioBlocked(error) {
  return error?.code === 'KOKORO_AUDIO_NOT_ENABLED'
    || error?.name === 'NotAllowedError';
}

async function audioToBlob(rawAudio) {
  // kokoro-js/Transformers.js RawAudio.toBlob() currently emits a 32-bit
  // floating-point WAV. Chromium usually decodes it, but Safari and iOS
  // Edge are less consistent. Normalize the waveform to PCM16 ourselves so
  // both Web Audio and HTMLAudioElement receive the same broadly supported
  // format.
  const samples = rawAudio?.audio ?? rawAudio?.data;
  const sampleRate = rawAudio?.sampling_rate ?? rawAudio?.sample_rate ?? 24000;
  if (samples && typeof samples.length === 'number') {
    return new Blob([encodeWav(samples, sampleRate)], { type: 'audio/wav' });
  }
  if (typeof rawAudio?.toBlob === 'function') return await rawAudio.toBlob();
  throw new Error('Kokoro returned an unsupported audio object.');
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

function createAudioError(message, originalError, code) {
  const error = new Error(message);
  error.name = originalError?.name || 'KokoroAudioPlaybackError';
  error.code = code;
  error.cause = originalError;
  return error;
}

export class KokoroTtsEngine {
  constructor({ onStatus = () => {} } = {}) {
    this.onStatus = onStatus;
    this.tts = null;
    this.loadPromise = null;

    // One AudioContext is kept for the lifetime of the page. iOS requires
    // resume() to be called from a real user gesture before async TTS work.
    this.audioContext = null;
    this.audioUnlocked = false;
    this.audioElement = null;
    this.audio = null;

    this.sourceNode = null;
    this.pendingPlayback = null;
    this.activeEntry = null;
    this.activeUrl = null;
    this.playbackStartedAt = 0;
    this.operationId = 0;
    this.cancelled = false;
    this.cache = new Map();
  }

  async init() {
    if (this.tts) return this;
    if (!this.loadPromise) this.loadPromise = this.loadModel();
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
        // A model download cannot always be aborted once Transformers.js has
        // started it. After Stop, allow the cacheable download to finish but
        // do not overwrite the player's Stopped state with stale progress.
        if (this.cancelled) return;
        const raw = Number(progress?.progress);
        const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : undefined;
        const detail = progress?.file ? `Downloading ${progress.file}` : 'Preparing local model';
        this.onStatus({ key: 'loading', label: 'Loading model', detail, progress: percent });
      },
    });
    if (!this.cancelled) this.onStatus({ key: 'ready', label: 'Kokoro model ready', detail: 'WASM + q8' });
  }

  isReady() {
    return Boolean(this.tts);
  }

  getVoices() {
    return this.tts?.list_voices?.() ?? [];
  }

  getAudioContext() {
    if (this.audioContext || typeof window === 'undefined') return this.audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    return this.audioContext;
  }

  isAudioReady() {
    const context = this.audioContext;
    if (context) return this.audioUnlocked && context.state === 'running';
    return this.audioUnlocked;
  }

  getAudioElement() {
    if (this.audioElement || typeof document === 'undefined') return this.audioElement;
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.setAttribute('aria-hidden', 'true');
    audio.style.display = 'none';
    document.body?.appendChild(audio);
    this.audioElement = audio;
    return audio;
  }

  async unlockHtmlAudio() {
    const audio = this.getAudioElement();
    if (!audio) throw new Error('This browser cannot create an audio element.');
    const unlockUrl = URL.createObjectURL(new Blob([encodeWav(new Float32Array(240), 24000)], { type: 'audio/wav' }));
    audio.muted = true;
    audio.src = unlockUrl;
    audio.load();
    try {
      // This is only a legacy fallback when AudioContext is unavailable. It
      // is awaited, so a rejected iOS play() is never silently ignored.
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } finally {
      audio.removeAttribute('src');
      audio.load();
      audio.muted = false;
      URL.revokeObjectURL(unlockUrl);
    }
  }

  async enableAudio() {
    this.onStatus({ key: 'enabling', label: 'Enabling Kokoro audio', detail: 'Waiting for the iOS audio session' });
    try {
      const context = this.getAudioContext();
      if (context) {
        // This method is called directly by the Enable button click. Do not
        // move resume() behind model loading or speech generation.
        let resumeTimer;
        try {
          await Promise.race([
            context.resume(),
            new Promise((_, reject) => {
              resumeTimer = window.setTimeout(() => reject(new KokoroAudioNotEnabledError('iOS did not respond to the audio unlock. Tap Enable Kokoro Audio again.')), 2000);
            }),
          ]);
        } finally {
          window.clearTimeout(resumeTimer);
        }
        if (context.state !== 'running') throw new KokoroAudioNotEnabledError('iOS did not start the audio session. Tap Enable Kokoro Audio again.');

        // Start a zero-volume buffer through the same context. This completes
        // the Web Audio unlock without relying on an unawaited HTMLAudio play.
        const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
        const source = context.createBufferSource();
        source.buffer = silentBuffer;
        source.connect(context.destination);
        source.start(0);
        source.onended = () => source.disconnect();
      } else {
        await this.unlockHtmlAudio();
      }
      this.audioUnlocked = true;
      this.onStatus({ key: 'ready', label: 'Kokoro audio enabled', detail: 'Ready to load the model when you press Play.' });
      return this;
    } catch (error) {
      this.audioUnlocked = false;
      const normalized = error instanceof KokoroAudioNotEnabledError
        ? error
        : createAudioError(error?.message || 'iOS blocked audio activation. Tap Enable Kokoro Audio again.', error, 'KOKORO_AUDIO_NOT_ENABLED');
      normalized.name = 'NotAllowedError';
      normalized.code = 'KOKORO_AUDIO_NOT_ENABLED';
      this.onStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: normalized.message });
      throw normalized;
    }
  }

  // Kept as a preflight method for the manager. Actual unlocking is explicit
  // and awaited by enableAudio(), which is bound to the user click.
  prepareForPlayback() {
    return this.isAudioReady();
  }

  assertAudioReady() {
    if (!this.isAudioReady()) throw new KokoroAudioNotEnabledError();
  }

  cacheKey(text, voice, speed) {
    return JSON.stringify([text, voice, Number(speed).toFixed(2)]);
  }

  touchCache(key, entry) {
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  addToCache(key, blob) {
    const entry = { url: URL.createObjectURL(blob), blob, audioBuffer: null };
    this.cache.set(key, entry);
    while (this.cache.size > CACHE_LIMIT) {
      const oldestKey = this.cache.keys().next().value;
      const oldest = this.cache.get(oldestKey);
      if (oldest?.url) URL.revokeObjectURL(oldest.url);
      this.cache.delete(oldestKey);
    }
    return entry;
  }

  async getAudioEntry(text, voice, speed) {
    const key = this.cacheKey(text, voice, speed);
    const cached = this.cache.get(key);
    if (cached) {
      this.touchCache(key, cached);
      return cached;
    }
    this.onStatus({ key: 'generating', label: 'Generating audio', detail: 'Creating local speech' });
    const rawAudio = await this.tts.generate(text, { voice, speed: Number(speed) || 1 });
    return this.addToCache(key, await audioToBlob(rawAudio));
  }

  async decodeAudio(entry) {
    const context = this.getAudioContext();
    if (!context) return null;
    if (!entry.audioBuffer) {
      try {
        const data = await entry.blob.arrayBuffer();
        entry.audioBuffer = await context.decodeAudioData(data.slice(0));
      } catch (error) {
        throw createAudioError('The generated WAV could not be decoded.', error, 'KOKORO_AUDIO_DECODE_ERROR');
      }
    }
    return entry.audioBuffer;
  }

  startBufferSource() {
    const playback = this.pendingPlayback;
    const context = this.audioContext;
    if (!playback || !context) return;
    if (context.state !== 'running') throw new KokoroAudioNotEnabledError();

    const source = context.createBufferSource();
    source.buffer = playback.buffer;
    source.connect(context.destination);
    this.sourceNode = source;
    this.playbackStartedAt = context.currentTime;
    source.onended = () => {
      if (this.sourceNode !== source) return;
      this.sourceNode = null;
      source.disconnect();
      const finished = this.pendingPlayback;
      this.pendingPlayback = null;
      this.activeEntry = null;
      this.activeUrl = null;
      if (finished && !this.cancelled) finished.resolve();
    };
    const offset = Math.min(playback.offset, Math.max(0, playback.buffer.duration - 0.001));
    source.start(0, offset);
    this.onStatus({ key: 'playing', label: 'Playing', detail: 'Kokoro local voice · Web Audio' });
  }

  async playWithWebAudio(entry) {
    const buffer = await this.decodeAudio(entry);
    if (!buffer) return this.playWithHtmlAudio(entry);
    this.activeEntry = entry;
    this.activeUrl = entry.url;
    return new Promise((resolve, reject) => {
      this.pendingPlayback = { mode: 'web-audio', resolve, reject, buffer, offset: 0 };
      try {
        this.startBufferSource();
      } catch (error) {
        this.pendingPlayback = null;
        reject(error);
      }
    });
  }

  playWithHtmlAudio(entry) {
    const audio = this.getAudioElement() || new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.src = entry.url;
    audio.load();
    this.audio = audio;
    this.activeEntry = entry;
    this.activeUrl = entry.url;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        this.audio = null;
        this.activeEntry = null;
        this.activeUrl = null;
        if (this.pendingPlayback?.audio === audio) this.pendingPlayback = null;
        callback(value);
      };
      audio.onended = () => finish(resolve);
      audio.onerror = () => finish(reject, createAudioError('The generated audio could not be played.', audio.error, 'KOKORO_AUDIO_PLAYBACK_ERROR'));
      try {
        Promise.resolve(audio.play()).then(() => {
          this.onStatus({ key: 'playing', label: 'Playing', detail: 'Kokoro local voice · HTML audio fallback' });
        }).catch((error) => finish(reject, isKokoroAudioBlocked(error)
          ? error
          : createAudioError(`Audio play failed: ${error?.message || error?.name || 'unknown error'}`, error, 'KOKORO_AUDIO_PLAYBACK_ERROR')));
      } catch (error) {
        finish(reject, createAudioError(`Audio play failed: ${error.message}`, error, 'KOKORO_AUDIO_PLAYBACK_ERROR'));
      }
      this.pendingPlayback = { mode: 'html', resolve: (value) => finish(resolve, value), reject: (error) => finish(reject, error), audio };
    });
  }

  async speak(text, { voiceName = 'af_heart', rate = 1 } = {}) {
    this.stop();
    const operationId = ++this.operationId;
    this.cancelled = false;
    this.assertAudioReady();
    await this.init();
    if (this.cancelled || operationId !== this.operationId) return;
    const entry = await this.getAudioEntry(text, voiceName, rate);
    if (this.cancelled || operationId !== this.operationId) return;

    if (this.audioContext) {
      try {
        return await this.playWithWebAudio(entry);
      } catch (error) {
        if (isKokoroAudioBlocked(error)) throw error;
        // Decode or Web Audio errors get one HTMLAudioElement attempt. If
        // that also fails, the UI asks the user whether to retry Kokoro or
        // explicitly switch to Browser Voice.
        this.onStatus({ key: 'error', label: 'Web Audio failed', detail: error.message });
      }
    }
    this.assertAudioReady();
    return this.playWithHtmlAudio(entry);
  }

  pause() {
    if (this.sourceNode && this.pendingPlayback?.mode === 'web-audio') {
      const context = this.audioContext;
      const elapsed = Math.max(0, context.currentTime - this.playbackStartedAt);
      this.pendingPlayback.offset = Math.min(this.pendingPlayback.buffer.duration, this.pendingPlayback.offset + elapsed);
      this.sourceNode.onended = null;
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
      this.onStatus({ key: 'paused', label: 'Paused', detail: 'Kokoro Web Audio' });
      return;
    }
    if (this.audio) {
      this.audio.pause();
      this.onStatus({ key: 'paused', label: 'Paused', detail: 'Kokoro HTML audio' });
    }
  }

  resume() {
    if (this.pendingPlayback?.mode === 'web-audio' && !this.sourceNode) {
      const continuePlayback = async () => {
        if (!this.audioUnlocked || !this.audioContext) throw new KokoroAudioNotEnabledError();
        if (this.audioContext.state !== 'running') await this.audioContext.resume();
        if (this.audioContext.state !== 'running') throw new KokoroAudioNotEnabledError();
        this.startBufferSource();
      };
      continuePlayback().catch((error) => {
        const blocked = isKokoroAudioBlocked(error);
        this.onStatus({ key: blocked ? 'blocked' : 'error', label: blocked ? 'Playback blocked by iOS' : 'Audio could not resume', detail: error.message });
        const pending = this.pendingPlayback;
        this.pendingPlayback = null;
        pending?.reject(error);
      });
      return;
    }
    if (this.audio) {
      try {
        Promise.resolve(this.audio.play()).then(() => this.onStatus({ key: 'playing', label: 'Playing', detail: 'Kokoro HTML audio' })).catch((error) => {
          const playbackError = isKokoroAudioBlocked(error) ? error : createAudioError(`Audio resume failed: ${error.message}`, error, 'KOKORO_AUDIO_PLAYBACK_ERROR');
          const blocked = isKokoroAudioBlocked(playbackError);
          this.onStatus({ key: blocked ? 'blocked' : 'error', label: blocked ? 'Playback blocked by iOS' : 'Audio could not resume', detail: playbackError.message });
          this.pendingPlayback?.reject(playbackError);
        });
      } catch (error) {
        this.pendingPlayback?.reject(error);
      }
    }
  }

  stop() {
    this.cancelled = true;
    this.operationId += 1;
    if (this.sourceNode) {
      this.sourceNode.onended = null;
      try { this.sourceNode.stop(); } catch { /* already ended */ }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.onended = null;
      this.audio.onerror = null;
      this.audio = null;
    }
    const pending = this.pendingPlayback;
    this.pendingPlayback = null;
    this.activeEntry = null;
    this.activeUrl = null;
    pending?.resolve?.();
    this.onStatus({ key: 'stopped', label: 'Stopped' });
  }

  clearCache() {
    for (const entry of this.cache.values()) URL.revokeObjectURL(entry.url);
    this.cache.clear();
  }
}

export { MODEL_ID, CACHE_LIMIT };
