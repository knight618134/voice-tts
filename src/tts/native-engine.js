export class NativeTtsEngine {
  constructor({ onStatus = () => {} } = {}) {
    this.onStatus = onStatus;
    this.synthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.voices = [];
    this.activeReject = null;
    this.activeUtterance = null;
    this.cancelled = false;

    if (this.synthesis) {
      this.refreshVoices();
      this.synthesis.addEventListener?.('voiceschanged', () => this.refreshVoices());
    }
  }

  async init() {
    if (!this.synthesis) {
      throw new Error('This browser does not provide SpeechSynthesis.');
    }
    this.refreshVoices();
    this.onStatus({ key: 'ready', label: 'Browser voice ready' });
    return this;
  }

  refreshVoices() {
    this.voices = this.synthesis?.getVoices?.() ?? [];
    return this.voices;
  }

  getVoices() {
    return [...this.voices];
  }

  isReady() {
    return Boolean(this.synthesis);
  }

  speak(text, { voiceName = '', rate = 1 } = {}) {
    if (!this.synthesis) return Promise.reject(new Error('SpeechSynthesis is unavailable.'));
    this.stop();
    this.cancelled = false;
    this.onStatus({ key: 'playing', label: 'Playing', detail: 'Browser voice' });

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.voices.find((candidate) => candidate.name === voiceName);
      if (voice) utterance.voice = voice;
      utterance.rate = Number(rate) || 1;
      utterance.onend = () => {
        this.activeUtterance = null;
        this.activeReject = null;
        if (!this.cancelled) resolve();
      };
      utterance.onerror = (event) => {
        this.activeUtterance = null;
        this.activeReject = null;
        if (this.cancelled && event.error === 'canceled') return;
        reject(new Error(event.error || 'SpeechSynthesis failed.'));
      };
      this.activeUtterance = utterance;
      this.activeReject = reject;
      this.synthesis.speak(utterance);
    });
  }

  pause() {
    this.synthesis?.pause();
    this.onStatus({ key: 'paused', label: 'Paused' });
  }

  resume() {
    this.synthesis?.resume();
    this.onStatus({ key: 'playing', label: 'Playing', detail: 'Browser voice' });
  }

  stop() {
    if (!this.synthesis) return;
    this.cancelled = true;
    this.synthesis.cancel();
    this.activeUtterance = null;
    this.activeReject = null;
    this.onStatus({ key: 'stopped', label: 'Stopped' });
  }
}
