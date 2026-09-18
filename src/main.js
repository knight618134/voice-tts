import './styles.css';
import { getSample } from './data/default-content.js';
import { getArticleSample, getArticleLevelLabel, getArticleTopicLabel } from './data/article-content.js';
import { TtsManager } from './tts/tts-manager.js';

const STORAGE_KEY = 'vocabulary-reader-weak-words';
const N8N_WEBHOOK_KEY = 'vocabulary-reader-n8n-webhook';
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
  pauseButton: $('#pauseButton'),
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
  enableKokoroAudioButton: $('#enableKokoroAudioButton'),
  quickEnableKokoroButton: $('#quickEnableKokoroButton'),
  kokoroAudioHint: $('#kokoroAudioHint'),
  rateInput: $('#rateInput'),
  rateValue: $('#rateValue'),
  delayInput: $('#delayInput'),
  delayValue: $('#delayValue'),
  repeatInput: $('#repeatInput'),
  settingsLockHint: $('#settingsLockHint'),
  weakList: $('#weakList'),
  weakCount: $('#weakCount'),
  clearWeakButton: $('#clearWeakButton'),
  practiceButton: $('#practiceButton'),
  weakPanel: $('.weak-panel'),
  articleFields: $('#articleFields'),
  articleTitleInput: $('#articleTitleInput'),
  articleLevelSelect: $('#articleLevelSelect'),
  articleTopicSelect: $('#articleTopicSelect'),
  articleFileInput: $('#articleFileInput'),
  importArticleButton: $('#importArticleButton'),
  generateN8nButton: $('#generateN8nButton'),
  n8nWebhookInput: $('#n8nWebhookInput'),
  quizInput: $('#quizInput'),
  quizPanel: $('#quizPanel'),
  quizList: $('#quizList'),
  showAnswersButton: $('#showAnswersButton'),
  notice: $('#notice'),
  kokoroErrorDialog: $('#kokoroErrorDialog'),
  kokoroErrorMessage: $('#kokoroErrorMessage'),
  retryKokoroButton: $('#retryKokoroButton'),
  switchBrowserButton: $('#switchBrowserButton'),
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
  mode: 'article',
  items: [],
  currentIndex: 0,
  isPlaying: false,
  isPaused: false,
  playToken: 0,
  practiceOnly: false,
  weakWords: loadWeakWords(),
  article: null,
  quiz: [],
  quizSelections: {},
  showAnswers: false,
  statusKey: 'ready',
};

const ttsManager = new TtsManager({
  onStatus: updateStatus,
  onAudioBlocked: () => showNotice('iOS 阻擋了播放，請先點擊 Enable Kokoro Audio。', 'warning'),
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

function splitIntoSentences(value) {
  const paragraphs = value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
  return paragraphs.flatMap((paragraph) => {
    if (segmenter) return [...segmenter.segment(paragraph)].map(({ segment }) => segment.trim()).filter(Boolean);
    return paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
  });
}

function parseQuiz(value) {
  if (!value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    const questions = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(questions)) return [];
    return questions.map((question) => ({
      question: String(question.question || '').trim(),
      options: Array.isArray(question.options) ? question.options.map((option) => String(option)) : [],
      answer: Number.isInteger(question.answer) ? question.answer : Number(question.answer),
      explanation: String(question.explanation || '').trim(),
    })).filter((question) => question.question && question.options.length >= 2 && question.answer >= 0 && question.answer < question.options.length);
  } catch {
    return [];
  }
}

function parseArticleContent(showMessage = true) {
  const title = elements.articleTitleInput.value.trim() || 'Untitled article';
  const level = elements.articleLevelSelect.value;
  const topic = elements.articleTopicSelect.value;
  const sentences = splitIntoSentences(elements.contentInput.value);
  state.article = { title, level, topic };
  state.items = sentences.map((text, index) => ({ id: `article-${index}-${text.slice(0, 12)}`, type: 'article', text, label: `Sentence ${index + 1}`, sentenceNumber: index + 1 }));
  state.quiz = parseQuiz(elements.quizInput.value);
  state.quizSelections = {};
  state.showAnswers = false;
  elements.sessionTitle.textContent = title;
  if (showMessage) showNotice(`${state.items.length} sentences loaded · ${getArticleLevelLabel(level)} · ${getArticleTopicLabel(topic)}`, 'success');
}

function parseContent() {
  if (state.mode === 'article') parseArticleContent(false);
  else {
    state.items = state.mode === 'word' ? parseWordLines(elements.contentInput.value) : parseDialogLines(elements.contentInput.value);
    state.article = null;
    state.quiz = [];
    elements.sessionTitle.textContent = 'Everyday English';
  }
  state.currentIndex = 0;
  state.practiceOnly = false;
  renderAll();
  if (state.mode !== 'article') showNotice(`${state.items.length} items loaded.`, 'success');
}

function visibleItems() {
  if (!state.practiceOnly) return state.items;
  return state.items.filter((item) => state.weakWords.has(item.text.toLowerCase()));
}

function renderAll() {
  renderReader();
  renderProgress();
  renderWeakWords();
  renderQuiz();
  updateModeFields();
  updatePlayerControls();
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
    card.className = `reader-item ${index === state.currentIndex ? 'is-current' : ''} ${item.type === 'dialog' ? `speaker-${item.speaker.toLowerCase()}` : ''} ${item.type === 'article' ? 'article-item' : ''}`;
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
    } else if (item.type === 'dialog') {
      card.innerHTML = `<div class="speaker-label">Speaker ${item.speaker}</div><p>${escapeHtml(item.text)}</p>`;
    } else {
      card.innerHTML = `<div class="article-index">${escapeHtml(item.label)}</div><p>${escapeHtml(item.text)}</p>`;
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
  if (state.mode === 'article' && item) elements.currentLabel.textContent = `${item.label} · ${item.text.slice(0, 48)}${item.text.length > 48 ? '…' : ''}`;
}

function renderWeakWords() {
  const weak = [...state.weakWords];
  elements.weakCount.textContent = String(weak.length);
  elements.weakList.innerHTML = weak.length ? weak.map((word) => `<span class="weak-chip">${escapeHtml(word)}</span>`).join('') : '<p class="empty-state">Tap “Mark weak” on a word to save it here.</p>';
}

function renderQuiz() {
  const visible = state.mode === 'article' && state.quiz.length > 0;
  elements.quizPanel.classList.toggle('is-hidden', !visible);
  if (!visible) return;
  elements.showAnswersButton.textContent = state.showAnswers ? 'Hide answers' : 'Show answers';
  elements.quizList.innerHTML = state.quiz.map((question, questionIndex) => {
    const selected = state.quizSelections[questionIndex];
    const answerVisible = state.showAnswers || selected !== undefined;
    const result = selected === undefined ? '' : selected === question.answer ? 'Correct' : 'Not quite';
    return `<article class="quiz-question"><p><strong>${questionIndex + 1}.</strong> ${escapeHtml(question.question)}</p><div class="quiz-options">${question.options.map((option, optionIndex) => `<button class="quiz-option ${selected === optionIndex ? 'is-selected' : ''} ${state.showAnswers && optionIndex === question.answer ? 'is-answer' : ''}" type="button" data-question="${questionIndex}" data-option="${optionIndex}">${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</button>`).join('')}</div>${answerVisible ? `<p class="quiz-feedback ${selected === question.answer ? 'is-correct' : state.showAnswers && selected === undefined ? '' : 'is-wrong'}">${selected === undefined ? `Answer: ${String.fromCharCode(65 + question.answer)}` : result}${question.explanation ? ` · ${escapeHtml(question.explanation)}` : ''}</p>` : ''}</article>`;
  }).join('');
  elements.quizList.querySelectorAll('.quiz-option').forEach((button) => button.addEventListener('click', () => {
    state.quizSelections[button.dataset.question] = Number(button.dataset.option);
    renderQuiz();
  }));
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
  const isArticle = state.mode === 'article';
  elements.articleFields.classList.toggle('is-hidden', !isArticle);
  elements.weakPanel.classList.toggle('is-hidden', state.mode !== 'word');
  elements.contentInput.previousElementSibling.textContent = isArticle ? 'Article text' : 'Paste lines';
  elements.contentHint.textContent = state.mode === 'word' ? 'Word mode: word | pronunciation | meaning | example' : state.mode === 'dialog' ? 'Dialog mode: one line per turn, e.g. A: Hello there.' : 'Article mode: paste paragraphs; the reader will split them into sentences.';
  elements.loadContentButton.textContent = isArticle ? 'Load article' : 'Load content';
}

function updateEngineFields() {
  const isKokoro = elements.engineSelect.value === 'kokoro';
  elements.browserVoiceFields.classList.toggle('is-hidden', isKokoro);
  elements.kokoroVoiceFields.classList.toggle('is-hidden', !isKokoro);
  if (isKokoro) {
    const enabled = ttsManager.isAudioReady();
    elements.enableKokoroAudioButton.textContent = enabled ? 'Kokoro Audio Enabled' : 'Enable Kokoro Audio';
    elements.kokoroAudioHint.textContent = enabled
      ? 'Audio is enabled. Press Play to lazy-load the WASM + q8 model.'
      : 'Tap once to unlock iPhone audio. The model still loads only when you press Play.';
    elements.quickEnableKokoroButton.classList.toggle('is-hidden', enabled);
  } else {
    elements.quickEnableKokoroButton.classList.add('is-hidden');
  }
  updatePlayerControls();
}

function updateStatus(status = {}) {
  state.statusKey = status.key || state.statusKey;
  const detail = status.detail ? ` · ${status.detail}` : '';
  elements.statusText.textContent = `${status.label || 'Ready'}${detail}`;
  elements.statusDot.dataset.status = state.statusKey;
  const isLoading = status.key === 'loading';
  elements.modelProgress.classList.toggle('is-hidden', !isLoading);
  if (Number.isFinite(status.progress)) elements.modelProgressBar.style.width = `${status.progress}%`;
  updatePlayerControls();
}

function speechSettingControls() {
  return [
    elements.engineSelect,
    elements.voiceASelect,
    elements.voiceBSelect,
    elements.kokoroVoiceSelect,
    elements.rateInput,
    elements.delayInput,
    elements.repeatInput,
  ];
}

function closeKokoroErrorDialog() {
  if (!elements.kokoroErrorDialog.open) return;
  if (typeof elements.kokoroErrorDialog.close === 'function') elements.kokoroErrorDialog.close();
  else elements.kokoroErrorDialog.removeAttribute('open');
}

function showKokoroErrorDialog(error) {
  const message = error?.message || 'Kokoro could not load or play this audio.';
  elements.kokoroErrorMessage.textContent = message;
  elements.retryKokoroButton.textContent = isKokoroBlockedError(error) ? 'Enable Kokoro again' : 'Keep Kokoro and retry';
  if (elements.kokoroErrorDialog.open) return;
  if (typeof elements.kokoroErrorDialog.showModal === 'function') elements.kokoroErrorDialog.showModal();
  else elements.kokoroErrorDialog.setAttribute('open', '');
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

function applyArticle(article, showMessage = true) {
  elements.articleTitleInput.value = article.title || 'Untitled article';
  elements.articleLevelSelect.value = article.level || 'a1';
  elements.articleTopicSelect.value = article.topic || 'nature';
  elements.contentInput.value = article.body || '';
  elements.quizInput.value = article.quiz?.length ? JSON.stringify(article.quiz, null, 2) : '';
  parseContent();
  if (showMessage) showNotice(`${state.items.length} sentences loaded · ${getArticleLevelLabel(article.level || 'a1')} · ${getArticleTopicLabel(article.topic || 'nature')}`, 'success');
}

function loadArticleSample() {
  const article = getArticleSample(elements.articleLevelSelect.value, elements.articleTopicSelect.value);
  applyArticle(article);
}

async function importArticleFile() {
  const file = elements.articleFileInput.files?.[0];
  if (!file) return;
  const body = await file.text();
  const title = file.name.replace(/\.txt$/i, '').replace(/[-_]+/g, ' ').trim();
  applyArticle({
    title: title || 'Imported article',
    level: elements.articleLevelSelect.value,
    topic: elements.articleTopicSelect.value,
    body,
    quiz: [],
  });
  elements.articleFileInput.value = '';
  showNotice('Article imported. Add quiz JSON if you want comprehension questions.', 'success');
}

function parseN8nPayload(payload) {
  let candidate = Array.isArray(payload) ? payload[0] : payload;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof candidate === 'string') {
      try {
        candidate = JSON.parse(candidate);
        continue;
      } catch {
        break;
      }
    }
    if (candidate?.article) {
      candidate = candidate.article;
      continue;
    }
    if (candidate?.data) {
      candidate = candidate.data;
      continue;
    }
    if (candidate?.output && typeof candidate.output === 'string') {
      candidate = candidate.output;
      continue;
    }
    break;
  }
  if (!candidate || typeof candidate !== 'object') throw new Error('n8n returned an unexpected response.');
  let quiz = candidate.quiz || candidate.questions || [];
  if (typeof quiz === 'string') {
    try { quiz = JSON.parse(quiz); } catch { quiz = []; }
  }
  const body = candidate.body || candidate.text || candidate.content;
  if (!body) throw new Error('n8n response is missing article body.');
  return {
    title: candidate.title || 'Generated article',
    level: elements.articleLevelSelect.value,
    topic: elements.articleTopicSelect.value,
    body: String(body),
    quiz: Array.isArray(quiz) ? quiz : [],
  };
}

async function generateWithN8n() {
  const webhook = elements.n8nWebhookInput.value.trim();
  if (!webhook) {
    showNotice('Paste an n8n webhook URL first.', 'warning');
    elements.n8nWebhookInput.focus();
    return;
  }
  localStorage.setItem(N8N_WEBHOOK_KEY, webhook);
  const originalLabel = elements.generateN8nButton.textContent;
  elements.generateN8nButton.disabled = true;
  elements.generateN8nButton.textContent = 'Generating…';
  updateStatus({ key: 'generating', label: 'Generating article', detail: 'Waiting for n8n' });
  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'generate-article',
        language: 'en',
        level: elements.articleLevelSelect.value,
        topic: elements.articleTopicSelect.value,
        quizCount: 3,
      }),
    });
    if (!response.ok) throw new Error(`n8n returned HTTP ${response.status}.`);
    applyArticle(parseN8nPayload(await response.json()));
    updateStatus({ key: 'ready', label: 'Article ready', detail: 'Generated by n8n' });
    showNotice('Article generated. Review it, then press Load article or Play.', 'success');
  } catch (error) {
    updateStatus({ key: 'error', label: 'Article generation failed', detail: error?.message || 'Check the webhook.' });
    showNotice(`n8n generation failed: ${error?.message || 'Check the webhook and CORS settings.'}`, 'error');
  } finally {
    elements.generateN8nButton.disabled = false;
    elements.generateN8nButton.textContent = originalLabel;
  }
}

function isKokoroBlockedError(error) {
  return error?.code === 'KOKORO_AUDIO_NOT_ENABLED' || error?.name === 'NotAllowedError';
}

async function enableKokoroAudio() {
  const originalLabel = elements.enableKokoroAudioButton.textContent;
  elements.enableKokoroAudioButton.disabled = true;
  elements.enableKokoroAudioButton.textContent = 'Enabling audio…';
  elements.quickEnableKokoroButton.disabled = true;
  elements.quickEnableKokoroButton.textContent = 'Enabling Kokoro audio…';
  try {
    await ttsManager.enableAudio();
    updateStatus({ key: 'ready', label: 'Kokoro audio enabled', detail: 'Ready to load the model when you press Play.' });
    elements.kokoroAudioHint.textContent = 'Audio is enabled. Press Play to lazy-load the WASM + q8 model.';
    showNotice('Kokoro 音訊已啟用，現在可以按 Play 載入模型。', 'success');
  } catch (error) {
    if (isKokoroBlockedError(error)) {
      updateStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error.message });
      showNotice('iOS 沒有允許音訊啟用，請直接再點一次 Enable Kokoro Audio。', 'warning');
    } else {
      updateStatus({ key: 'error', label: 'Kokoro audio could not be enabled', detail: error.message });
      showNotice(`Kokoro 音訊啟用失敗：${error.message}`, 'error');
    }
  } finally {
    if (!ttsManager.isAudioReady()) elements.enableKokoroAudioButton.textContent = originalLabel;
    elements.quickEnableKokoroButton.textContent = 'Enable Kokoro Audio';
    updateEngineFields();
  }
}

async function sessionDelay(ms, token) {
  let remaining = ms;
  while (remaining > 0 && state.isPlaying && token === state.playToken) {
    if (state.isPaused) {
      await new Promise((resolve) => window.setTimeout(resolve, 80));
      continue;
    }
    const interval = Math.min(remaining, 80);
    await new Promise((resolve) => window.setTimeout(resolve, interval));
    remaining -= interval;
  }
}

async function playSession() {
  const items = visibleItems();
  if (!items.length) {
    showNotice('There is nothing to play yet.', 'warning');
    return;
  }
  if (state.isPlaying) return;
  if (elements.engineSelect.value === 'kokoro' && !ttsManager.isAudioReady()) {
    updateStatus({ key: 'not-enabled', label: 'Kokoro audio not enabled', detail: 'Tap Enable Kokoro Audio first.' });
    showNotice('請先點擊 Enable Kokoro Audio，再按 Play。', 'warning');
    return;
  }

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
      await sessionDelay(Number(elements.delayInput.value) * 1000, token);
    }
  } catch (error) {
    if (state.isPlaying) {
      state.isPlaying = false;
      state.isPaused = false;
      if (isKokoroBlockedError(error)) {
        updateStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error?.message || 'Tap Enable Kokoro Audio.' });
        showNotice('播放被 iOS 阻擋。請在視窗中重新啟用 Kokoro，或自行選擇 Browser Voice。', 'warning');
        showKokoroErrorDialog(error);
      } else if (elements.engineSelect.value === 'kokoro') {
        updateStatus({ key: 'error', label: 'Kokoro could not play', detail: error?.message || 'Retry or choose Browser Voice.' });
        showKokoroErrorDialog(error);
      } else {
        updateStatus({ key: 'error', label: 'Browser voice error', detail: error?.message || 'Speech failed.' });
        showNotice(error?.message || 'Browser Voice could not play.', 'error');
      }
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
  if (!state.isPlaying || state.isPaused) return;
  const statusKey = ttsManager.getStatus().status?.key;
  if (['loading', 'generating', 'enabling'].includes(statusKey)) {
    showNotice('Audio is still loading. Pause becomes available when playback starts.', 'info');
    return;
  }
  state.isPaused = true;
  ttsManager.pause();
  updatePlayerControls();
}

function resumePlayback() {
  if (!state.isPlaying || !state.isPaused) return;
  state.isPaused = false;
  ttsManager.resume();
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
  const isKokoro = elements.engineSelect.value === 'kokoro';
  const audioReady = !isKokoro || ttsManager.isAudioReady();
  const hasItems = visibleItems().length > 0;
  const busyBeforePlayback = ['loading', 'generating', 'enabling'].includes(state.statusKey);
  const settingsLocked = state.isPlaying;

  elements.playIcon.textContent = '▶';
  elements.playText.textContent = 'Play';
  elements.playButton.setAttribute('aria-label', audioReady ? 'Play current item' : 'Enable Kokoro Audio before playback');
  elements.playButton.disabled = settingsLocked || !audioReady || !hasItems;
  elements.pauseButton.textContent = state.isPaused ? 'Resume' : 'Pause';
  elements.pauseButton.setAttribute('aria-label', state.isPaused ? 'Resume playback' : 'Pause playback');
  elements.pauseButton.disabled = !state.isPlaying || (!state.isPaused && busyBeforePlayback);
  elements.stopButton.disabled = !state.isPlaying;
  elements.settingsLockHint.classList.toggle('is-hidden', !settingsLocked);
  speechSettingControls().forEach((control) => { control.disabled = settingsLocked; });
  elements.enableKokoroAudioButton.disabled = settingsLocked || !isKokoro || ttsManager.isAudioReady() || state.statusKey === 'enabling';
  elements.quickEnableKokoroButton.disabled = settingsLocked || !isKokoro || ttsManager.isAudioReady() || state.statusKey === 'enabling';
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
  if (mode === 'article') loadArticleSample();
  else {
    elements.contentInput.value = getSample(mode);
    parseContent();
  }
}

elements.playButton.addEventListener('click', () => playSession());
elements.pauseButton.addEventListener('click', () => (state.isPaused ? resumePlayback() : pausePlayback()));
elements.stopButton.addEventListener('click', () => stopPlayback());
elements.previousButton.addEventListener('click', () => stepItem(-1));
elements.nextButton.addEventListener('click', () => stepItem(1));
elements.loadContentButton.addEventListener('click', () => { stopPlayback(false); parseContent(); });
elements.sampleButton.addEventListener('click', () => {
  if (state.mode === 'article') loadArticleSample();
  else { elements.contentInput.value = getSample(state.mode); parseContent(); }
});
elements.importArticleButton.addEventListener('click', () => elements.articleFileInput.click());
elements.articleFileInput.addEventListener('change', () => importArticleFile().catch((error) => showNotice(`Could not import article: ${error.message}`, 'error')));
elements.generateN8nButton.addEventListener('click', () => generateWithN8n());
elements.enableKokoroAudioButton.addEventListener('click', () => enableKokoroAudio());
elements.quickEnableKokoroButton.addEventListener('click', () => enableKokoroAudio());
elements.showAnswersButton.addEventListener('click', () => { state.showAnswers = !state.showAnswers; renderQuiz(); });
elements.engineSelect.addEventListener('change', () => {
  stopPlayback(false);
  ttsManager.setEngine(elements.engineSelect.value);
  updateEngineFields();
  if (elements.engineSelect.value === 'kokoro') showNotice('請先點擊 Enable Kokoro Audio，再按 Play 載入本地模型。', 'info');
});
elements.kokoroErrorDialog.addEventListener('cancel', (event) => event.preventDefault());
elements.retryKokoroButton.addEventListener('click', async () => {
  closeKokoroErrorDialog();
  elements.engineSelect.value = 'kokoro';
  ttsManager.setEngine('kokoro');
  updateEngineFields();
  if (!ttsManager.isAudioReady()) await enableKokoroAudio();
  if (ttsManager.isAudioReady()) playSession();
});
elements.switchBrowserButton.addEventListener('click', () => {
  closeKokoroErrorDialog();
  elements.engineSelect.value = 'native';
  ttsManager.setEngine('native');
  updateEngineFields();
  showNotice('已依你的選擇切換至 Browser Voice，並從目前項目繼續。', 'info');
  playSession();
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

elements.n8nWebhookInput.value = localStorage.getItem(N8N_WEBHOOK_KEY) || '';
ttsManager.setEngine('kokoro');
updateEngineFields();
loadArticleSample();
populateNativeVoices();
