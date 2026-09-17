import './styles.css';
import { getSample } from './data/default-content.js';
import { TtsManager } from './tts/tts-manager.js';

const STORAGE_KEY = 'vocabulary-reader-weak-words';
const $ = (selector) => document.querySelector(selector);

const elements = {
  reader: $('#reader'),
  contentInput: $('#contentInput'),
  contentHint: $('#contentHint'),
  sessionTitle: $('#sessionTitle'),
  progressLabel: $('#progressLabel'),
  progressBar: $('#progressBar'),
  currentLabel: $('#currentLabel'),
  statusText: $('#statusText'),
  statusDot: $('#statusDot'),
  modelProgress: $('#modelProgress'),
  modelProgressBar: $('#modelProgressBar'),
  playButton: $('#playButton'),
  playIcon: $('#playIcon'),
  playText: $('#playText'),
  stopButton: $('#stopButton'),
  previousButton: $('#previousButton'),
  nextButton: $('#nextButton'),
  loadContentButton: $('#loadContentButton'),
  sampleButton: $('#sampleButton'),
  engineSelect: $('#engineSelect'),
  browserVoiceFields: $('#browserVoiceFields'),
  kokoroVoiceFields: $('#kokoroVoiceFields'),
  voiceASelect: $('#voiceASelect'),
  voiceBSelect: $('#voiceBSelect'),
  kokoroVoiceSelect: $('#kokoroVoiceSelect'),
  rateInput: $('#rateInput'),
  rateValue: $('#rateValue'),
  delayInput: $('#delayInput'),
  delayValue: $('#delayValue'),
  repeatInput: $('#repeatInput'),
  weakList: $('#weakList'),
  weakCount: $('#weakCount'),
  clearWeakButton: $('#clearWeakButton'),
  practiceButton: $('#practiceButton'),
  notice: $('#notice'),
};

function loadWeakWords() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return new Set();
  }
}

const state = {
  mode: 'word',
  items: [],
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  playToken: 0,
  practiceOnly: false,
  weakWords: loadWeakWords(),
  statusKey: 'ready',
};

const ttsManager = new TtsManager({
  onStatus: updateStatus,
  onFallback: (message) => {
    elements.engineSelect.value = 'native';
    updateEngineFields();
    showNotice(`Kokoro 載入失敗，已切回 Browser Voice：${message}`, 'warning');
  },
});

function parseWordLines(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [word = '', pronunciation = '', meaning = '', example = ''] = line.split('|').map((part) => part.trim());
    return {
      id: `word-${index}-${word.toLowerCase()}`,
      type: 'word',
      text: word,
      label: word,
      pronunciation,
      meaning,
      example: example || `Say “${word}” aloud once.`,
      speaker: 'A',
    };
  }).filter((item) => item.text);
}

function parseDialogLines(value) {
  return value.split('\n').map((rawLine, index) => ({ line: rawLine.trim(), index })).filter(({ line }) => line).map(({ line, index }) => {
    const match = line.match(/^([AB])\s*:\s*(.*)$/i);
    const speaker = match?.[1]?.toUpperCase() || (index % 2 === 0 ? 'A' : 'B');
    const text = match?.[2]?.trim() || line;
    return { id: `dialog-${index}-${text.slice(0, 12)}`, type: 'dialog', text, label: speaker, speaker };
  });
}

function parseContent() {
  state.items = state.mode === 'word' ? parseWordLines(elements.contentInput.value) : parseDialogLines(elements.contentInput.value);
  state.currentIndex = 0;
  state.practiceOnly = false;
  renderAll();
  showNotice(`${state.items.length} items loaded.`, 'success');
}

function visibleItems() {
  if (!state.practiceOnly) return state.items;
  return state.items.filter((item) => state.weakWords.has(item.text.toLowerCase()));
}

function renderAll() {
  renderReader();
  renderProgress();
  renderWeakWords();
  updateModeFields();
}

function renderReader() {
  elements.reader.innerHTML = '';
  const items = visibleItems();
  if (!items.length) {
    elements.reader.innerHTML = `<div class="empty-reader"><span class="empty-icon">✦</span><strong>${state.practiceOnly ? 'No weak words yet' : 'Nothing to read'}</strong><p>${state.practiceOnly ? 'Mark a word as weak and come back for focused practice.' : 'Paste some lines above to begin.'}</p></div>`;
    return;
  }
  items.forEach((item, index) => {
    const card = document.createElement('article');
    card.className = `reader-item ${index === state.currentIndex ? 'is-current' : ''} ${item.type === 'dialog' ? `speaker-${item.speaker.toLowerCase()}` : ''}`;
    card.dataset.index = String(index);
    card.tabIndex = 0;
    card.addEventListener('click', () => selectItem(index));
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') selectItem(index); });

    if (item.type === 'word') {
      card.innerHTML = `
        <div class="item-main"><div class="word-line"><strong>${escapeHtml(item.label)}</strong><span class="pronunciation">${escapeHtml(item.pronunciation)}</span></div><p>${escapeHtml(item.meaning)}</p><small>${escapeHtml(item.example)}</small></div>
        <button class="weak-button ${state.weakWords.has(item.text.toLowerCase()) ? 'is-weak' : ''}" type="button" aria-label="Mark ${escapeHtml(item.label)} as weak">${state.weakWords.has(item.text.toLowerCase()) ? 'Weak' : 'Mark weak'}</button>`;
      card.querySelector('.weak-button').addEventListener('click', (event) => {
        event.stopPropagation();
        toggleWeak(item.text);
      });
    } else {
      card.innerHTML = `<div class="speaker-label">Speaker ${item.speaker}</div><p>${escapeHtml(item.text)}</p>`;
    }
    elements.reader.appendChild(card);
  });
}

function renderProgress() {
  const items = visibleItems();
  const total = items.length;
  const current = total ? Math.min(state.currentIndex + 1, total) : 0;
  elements.progressLabel.textContent = `${current} / ${total}`;
  elements.progressBar.style.width = `${total ? (current / total) * 100 : 0}%`;
  const item = items[state.currentIndex];
  elements.currentLabel.textContent = item?.label || 'Ready to read';
  if (state.mode === 'dialog' && item) elements.currentLabel.textContent = `Speaker ${item.speaker}`;
}

function renderWeakWords() {
  const weak = [...state.weakWords];
  elements.weakCount.textContent = String(weak.length);
  elements.weakList.innerHTML = weak.length ? weak.map((word) => `<span class="weak-chip">${escapeHtml(word)}</span>`).join('') : '<p class="empty-state">Tap “Mark weak” on a word to save it here.</p>';
}

function selectItem(index) {
  const items = visibleItems();
  if (!items[index]) return;
  stopPlayback(false);
  state.currentIndex = index;
  renderAll();
}

function toggleWeak(word) {
  const key = word.toLowerCase();
  if (state.weakWords.has(key)) state.weakWords.delete(key);
  else state.weakWords.add(key);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.weakWords]));
  renderAll();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function updateModeFields() {
  elements.contentHint.textContent = state.mode === 'word' ? 'Word mode: word | pronunciation | meaning | example' : 'Dialog mode: one line per turn, e.g. A: Hello there.';
}

function updateEngineFields() {
  const isKokoro = elements.engineSelect.value === 'kokoro';
  elements.browserVoiceFields.classList.toggle('is-hidden', isKokoro);
  elements.kokoroVoiceFields.classList.toggle('is-hidden', !isKokoro);
}

function updateStatus(status = {}) {
  state.statusKey = status.key || state.statusKey;
  const detail = status.detail ? ` · ${status.detail}` : '';
  elements.statusText.textContent = `${status.label || 'Ready'}${detail}`;
  elements.statusDot.dataset.status = state.statusKey;
  const isLoading = status.key === 'loading';
  elements.modelProgress.classList.toggle('is-hidden', !isLoading);
  if (Number.isFinite(status.progress)) elements.modelProgressBar.style.width = `${status.progress}%`;
}

function showNotice(message, type = 'info') {
  elements.notice.textContent = message;
  elements.notice.dataset.type = type;
  elements.notice.classList.add('is-visible');
  window.clearTimeout(showNotice.timeout);
  showNotice.timeout = window.setTimeout(() => elements.notice.classList.remove('is-visible'), 7000);
}

function getVoiceFor(item) {
  if (elements.engineSelect.value === 'kokoro') return elements.kokoroVoiceSelect.value;
  return state.mode === 'dialog' && item?.speaker === 'B' ? elements.voiceBSelect.value : elements.voiceASelect.value;
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function playSession() {
  const items = visibleItems();
  if (!items.length) {
    showNotice('There is nothing to play yet.', 'warning');
    return;
  }
  if (state.isPaused) {
    state.isPaused = false;
    ttsManager.resume();
    updatePlayerControls();
    return;
  }
  if (state.isPlaying) return;

  state.isPlaying = true;
  state.isPaused = false;
  const token = ++state.playToken;
  updatePlayerControls();
  try {
    while (state.isPlaying && token === state.playToken) {
      const currentItems = visibleItems();
      const item = currentItems[state.currentIndex];
      if (!item) break;
      renderReader();
      renderProgress();
      const repeats = Number(elements.repeatInput.value);
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        if (!state.isPlaying || token !== state.playToken) return;
        await ttsManager.speak(item.text, { voiceName: getVoiceFor(item), rate: Number(elements.rateInput.value) });
      }
      if (!state.isPlaying || token !== state.playToken) return;
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= currentItems.length) {
        state.isPlaying = false;
        updateStatus({ key: 'ready', label: 'Session complete', detail: 'Nice work.' });
        break;
      }
      state.currentIndex = nextIndex;
      renderReader();
      renderProgress();
      await delay(Number(elements.delayInput.value) * 1000);
    }
  } catch (error) {
    if (state.isPlaying) {
      state.isPlaying = false;
      updateStatus({ key: 'error', label: 'Speech error', detail: error?.message || 'Try Browser Voice.' });
      showNotice(error?.message || 'Speech failed. Browser Voice is available as a fallback.', 'error');
    }
  } finally {
    if (token === state.playToken) {
      state.isPlaying = false;
      state.isPaused = false;
      updatePlayerControls();
    }
  }
}

function pausePlayback() {
  if (!state.isPlaying) return;
  state.isPaused = true;
  ttsManager.pause();
  updatePlayerControls();
}

function stopPlayback(showStatus = true) {
  state.playToken += 1;
  state.isPlaying = false;
  state.isPaused = false;
  ttsManager.stop();
  if (showStatus) updateStatus({ key: 'stopped', label: 'Stopped' });
  updatePlayerControls();
}

function stepItem(direction) {
  const items = visibleItems();
  if (!items.length) return;
  stopPlayback(false);
  state.currentIndex = (state.currentIndex + direction + items.length) % items.length;
  renderAll();
}

function updatePlayerControls() {
  const isPaused = state.isPaused;
  elements.playIcon.textContent = isPaused ? '▶' : state.isPlaying ? 'Ⅱ' : '▶';
  elements.playText.textContent = isPaused ? 'Resume' : state.isPlaying ? 'Pause' : 'Play';
  elements.playButton.setAttribute('aria-label', isPaused ? 'Resume playback' : state.isPlaying ? 'Pause playback' : 'Play current item');
}

function populateNativeVoices() {
  const voices = ttsManager.engines.native.getVoices();
  const currentA = elements.voiceASelect.value;
  const currentB = elements.voiceBSelect.value;
  const options = voices.length ? voices : [{ name: '', label: 'System default voice' }];
  const markup = options.map((voice) => `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.label || `${voice.name} · ${voice.lang || ''}`)}</option>`).join('');
  elements.voiceASelect.innerHTML = markup;
  elements.voiceBSelect.innerHTML = markup;
  if (options.some((voice) => voice.name === currentA)) elements.voiceASelect.value = currentA;
  if (options.some((voice) => voice.name === currentB)) elements.voiceBSelect.value = currentB;
}

function setMode(mode) {
  stopPlayback(false);
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  elements.contentInput.value = getSample(mode);
  parseContent();
}

elements.playButton.addEventListener('click', () => (state.isPlaying && !state.isPaused ? pausePlayback() : playSession()));
elements.stopButton.addEventListener('click', () => stopPlayback());
elements.previousButton.addEventListener('click', () => stepItem(-1));
elements.nextButton.addEventListener('click', () => stepItem(1));
elements.loadContentButton.addEventListener('click', () => { stopPlayback(false); parseContent(); });
elements.sampleButton.addEventListener('click', () => { elements.contentInput.value = getSample(state.mode); parseContent(); });
elements.engineSelect.addEventListener('change', () => {
  stopPlayback(false);
  ttsManager.setEngine(elements.engineSelect.value);
  updateEngineFields();
  if (elements.engineSelect.value === 'kokoro') showNotice('Kokoro will load locally when you press Play. iPhone Safari may fall back if audio activation expires.', 'info');
});
elements.rateInput.addEventListener('input', () => { elements.rateValue.textContent = `${Number(elements.rateInput.value).toFixed(1)}×`; });
elements.delayInput.addEventListener('input', () => { elements.delayValue.textContent = `${Number(elements.delayInput.value).toFixed(1)}s`; });
elements.clearWeakButton.addEventListener('click', () => { state.weakWords.clear(); localStorage.removeItem(STORAGE_KEY); renderWeakWords(); renderReader(); });
elements.practiceButton.addEventListener('click', () => {
  if (!state.weakWords.size) { showNotice('Mark at least one word as weak first.', 'warning'); return; }
  stopPlayback(false);
  state.practiceOnly = !state.practiceOnly;
  state.currentIndex = 0;
  elements.practiceButton.textContent = state.practiceOnly ? 'Show all items' : 'Practice weak words';
  renderAll();
});
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
window.speechSynthesis?.addEventListener?.('voiceschanged', populateNativeVoices);

elements.contentInput.value = getSample('word');
updateEngineFields();
parseContent();
ttsManager.init('native').then(populateNativeVoices).catch((error) => {
  updateStatus({ key: 'error', label: 'Browser voice unavailable', detail: error.message });
  showNotice('This browser has no SpeechSynthesis. Try a supported mobile or desktop browser.', 'error');
});
