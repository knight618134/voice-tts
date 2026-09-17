import { NativeTtsEngine } from './native-engine.js';
import { KokoroTtsEngine } from './kokoro-engine.js';

export class TtsManager {
  constructor({ onStatus = () => {}, onFallback = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onFallback = onFallback;
    this.currentEngine = 'native';
    this.engines = {
      native: new NativeTtsEngine({ onStatus }),
      kokoro: new KokoroTtsEngine({ onStatus }),
    };
  }

  async init(engine = this.currentEngine) {
    return this.engines[engine].init();
  }

  setEngine(engine) {
    if (!this.engines[engine]) throw new Error(`Unknown TTS engine: ${engine}`);
    this.stop();
    this.currentEngine = engine;
    this.onStatus({ key: 'ready', label: engine === 'native' ? 'Browser voice ready' : 'Kokoro ready to load', detail: engine === 'native' ? '' : 'Model loads on first play.' });
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
      const message = error?.message || 'Kokoro is unavailable.';
      this.onFallback(message);
      this.currentEngine = 'native';
      try {
        await this.engines.native.init();
        return await this.engines.native.speak(text, options);
      } catch (fallbackError) {
        this.onStatus({ key: 'error', label: 'Speech error', detail: fallbackError?.message || message });
        throw fallbackError;
      }
    }
  }

  prepareForPlayback() {
    this.engines[this.currentEngine].prepareForPlayback?.();
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
    return { engine: this.currentEngine, ready: this.isReady() };
  }
}
