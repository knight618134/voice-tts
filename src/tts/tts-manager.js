import { NativeTtsEngine } from './native-engine.js';
import { isKokoroAudioBlocked, KokoroTtsEngine } from './kokoro-engine.js';

export class TtsManager {
  constructor({ onStatus = () => {}, onAudioBlocked = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onAudioBlocked = onAudioBlocked;
    this.lastStatus = { key: 'ready', label: 'Ready' };
    const reportStatus = (status) => {
      this.lastStatus = status;
      this.onStatus(status);
    };
    this.currentEngine = 'kokoro';
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
    const kokoroEnabled = engine === 'kokoro' && this.engines.kokoro.isAudioReady();
    this.reportStatus({
      key: engine === 'native' || kokoroEnabled ? 'ready' : 'not-enabled',
      label: engine === 'native' ? 'Browser voice ready' : kokoroEnabled ? 'Kokoro audio enabled' : 'Kokoro audio not enabled',
      detail: engine === 'native' ? '' : kokoroEnabled ? 'Ready to load the model when you press Play.' : 'Tap Enable Kokoro Audio before Play.',
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
      this.reportStatus({ key: 'error', label: 'Kokoro could not play', detail: message });
      // Switching engines must always be an explicit user choice. The UI
      // offers Retry Kokoro and Switch to Browser Voice after this rejection.
      throw error;
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
