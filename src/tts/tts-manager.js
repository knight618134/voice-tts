import { NativeTtsEngine } from './native-engine.js';
import { isKokoroAudioBlocked, KokoroTtsEngine } from './kokoro-engine.js';

export class TtsManager {
  constructor({ onStatus = () => {}, onFallback = () => {}, onAudioBlocked = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onFallback = onFallback;
    this.onAudioBlocked = onAudioBlocked;
    this.lastStatus = { key: 'ready', label: 'Ready' };
    const reportStatus = (status) => {
      this.lastStatus = status;
      this.onStatus(status);
    };
    this.currentEngine = 'native';
    this.engines = {
      native: new NativeTtsEngine({ onStatus: reportStatus }),
      kokoro: new KokoroTtsEngine({ onStatus: reportStatus }),
    };
    this.reportStatus = reportStatus;
  }

  async init(engine = this.currentEngine) {
    return this.engines[engine].init();
  }

  setEngine(engine) {
    if (!this.engines[engine]) throw new Error(`Unknown TTS engine: ${engine}`);
    this.stop();
    this.currentEngine = engine;
    this.reportStatus({
      key: engine === 'native' ? 'ready' : 'not-enabled',
      label: engine === 'native' ? 'Browser voice ready' : 'Kokoro audio not enabled',
      detail: engine === 'native' ? '' : 'Tap Enable Kokoro Audio before Play.',
    });
  }

  get engine() {
    return this.currentEngine;
  }

  async speak(text, options = {}) {
    const selected = this.engines[this.currentEngine];
    try {
      return await selected.speak(text, options);
    } catch (error) {
      if (this.currentEngine !== 'kokoro') throw error;
      if (isKokoroAudioBlocked(error)) {
        this.reportStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error?.message || 'Tap Enable Kokoro Audio.' });
        this.onAudioBlocked(error);
        throw error;
      }
      const message = error?.message || 'Kokoro is unavailable.';
      this.onFallback(message);
      this.currentEngine = 'native';
      try {
        await this.engines.native.init();
        return await this.engines.native.speak(text, options);
      } catch (fallbackError) {
        this.reportStatus({ key: 'error', label: 'Speech error', detail: fallbackError?.message || message });
        throw fallbackError;
      }
    }
  }

  async enableAudio() {
    if (this.currentEngine !== 'kokoro') return this.engines.kokoro;
    try {
      return await this.engines.kokoro.enableAudio();
    } catch (error) {
      if (isKokoroAudioBlocked(error)) {
        this.reportStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error.message });
        this.onAudioBlocked(error);
      }
      throw error;
    }
  }

  prepareForPlayback() {
    this.engines[this.currentEngine].prepareForPlayback?.();
  }

  isAudioReady() {
    return this.currentEngine !== 'kokoro' || this.engines.kokoro.isAudioReady();
  }

  pause() {
    this.engines[this.currentEngine].pause();
  }

  resume() {
    this.engines[this.currentEngine].resume();
  }

  stop() {
    Object.values(this.engines).forEach((engine) => engine.stop());
  }

  isReady() {
    return this.engines[this.currentEngine].isReady();
  }

  getVoices() {
    return this.engines[this.currentEngine].getVoices();
  }

  getStatus() {
    return { engine: this.currentEngine, ready: this.isReady(), audioReady: this.isAudioReady(), status: this.lastStatus };
  }
}
