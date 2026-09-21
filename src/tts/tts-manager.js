import { NativeTtsEngine } from './native-engine.js';
import { isPiperAudioBlocked, PiperTtsEngine } from './piper-engine.js';

export class TtsManager {
  constructor({ onStatus = () => {}, onAudioBlocked = () => {} } = {}) {
    this.onStatus = onStatus;
    this.onAudioBlocked = onAudioBlocked;
    this.lastStatus = { key: 'ready', label: 'Ready' };
    const reportStatus = (status) => {
      this.lastStatus = status;
      this.onStatus(status);
    };
    this.currentEngine = 'piper';
    this.engines = {
      native: new NativeTtsEngine({ onStatus: reportStatus }),
      piper: new PiperTtsEngine({ onStatus: reportStatus }),
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
    const piperEnabled = engine === 'piper' && this.engines.piper.isAudioReady();
    this.reportStatus({
      key: engine === 'native' || piperEnabled ? 'ready' : 'not-enabled',
      label: engine === 'native' ? 'Browser voice ready' : piperEnabled ? 'Piper audio enabled' : 'Piper audio not enabled',
      detail: engine === 'native' ? '' : piperEnabled ? 'Ready to load the voice when you press Play.' : 'Tap Enable Piper Audio before Play.',
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
      if (this.currentEngine !== 'piper') throw error;
      if (isPiperAudioBlocked(error)) {
        this.reportStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error?.message || 'Tap Enable Piper Audio.' });
        this.onAudioBlocked(error);
        throw error;
      }
      const message = error?.message || 'Piper is unavailable.';
      this.reportStatus({ key: 'error', label: 'Piper could not play', detail: message });
      // Switching engines must always be an explicit user choice. The UI
      // offers Retry Piper and Switch to Browser Voice after this rejection.
      throw error;
    }
  }

  async enableAudio() {
    if (this.currentEngine !== 'piper') return this.engines.piper;
    try {
      return await this.engines.piper.enableAudio();
    } catch (error) {
      if (isPiperAudioBlocked(error)) {
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
    return this.currentEngine !== 'piper' || this.engines.piper.isAudioReady();
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
