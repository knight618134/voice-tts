import './styles.css';
import { getSample } from './data/default-content.js';
import { getArticleSample, getArticleLevelLabel, getArticleTopicLabel } from './data/article-content.js';
import {
  exportKoreanContent,
  getKoreanContent,
  KOREAN_CONTENT_STORAGE_KEY,
  mergeKoreanContent,
  saveImportedKoreanContent,
  validateKoreanBundle,
} from './data/korean-content.js';
import { TtsManager } from './tts/tts-manager.js';

const STORAGE_KEY = 'vocabulary-reader-weak-words';
const N8N_WEBHOOK_KEY = 'vocabulary-reader-n8n-webhook';
const KOREAN_REVIEW_KEY = 'vocabulary-reader:korean-review:v1';
const KOREAN_QUIZ_KEY = 'vocabulary-reader:korean-quiz:v1';
const KOREAN_WORD_PROGRESS_KEY = 'vocabulary-reader:korean-word-progress:v1';
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
  piperVoiceFields: $('#piperVoiceFields'),
  voiceASelect: $('#voiceASelect'),
  voiceBSelect: $('#voiceBSelect'),
  piperVoiceSelect: $('#piperVoiceSelect'),
  enablePiperAudioButton: $('#enablePiperAudioButton'),
  quickEnablePiperButton: $('#quickEnablePiperButton'),
  piperAudioHint: $('#piperAudioHint'),
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
  articlePlaybackSelect: $('#articlePlaybackSelect'),
  articleFileInput: $('#articleFileInput'),
  importArticleButton: $('#importArticleButton'),
  generateN8nButton: $('#generateN8nButton'),
  n8nWebhookInput: $('#n8nWebhookInput'),
  quizInput: $('#quizInput'),
  quizPanel: $('#quizPanel'),
  quizList: $('#quizList'),
  showAnswersButton: $('#showAnswersButton'),
  notice: $('#notice'),
  piperErrorDialog: $('#piperErrorDialog'),
  piperErrorMessage: $('#piperErrorMessage'),
  retryPiperButton: $('#retryPiperButton'),
  switchBrowserButton: $('#switchBrowserButton'),
  languageSelect: $('#languageSelect'),
  koreanModeTabs: $('#koreanModeTabs'),
  koreanFields: $('#koreanFields'),
  koreanLessonSelect: $('#koreanLessonSelect'),
  koreanLessonHint: $('#koreanLessonHint'),
  loadKoreanLessonButton: $('#loadKoreanLessonButton'),
  importKoreanButton: $('#importKoreanButton'),
  koreanFileInput: $('#koreanFileInput'),
  koreanImportPreview: $('#koreanImportPreview'),
  confirmKoreanImportButton: $('#confirmKoreanImportButton'),
  exportKoreanJsonButton: $('#exportKoreanJsonButton'),
  exportKoreanTsvButton: $('#exportKoreanTsvButton'),
  koreanNotebookPanel: $('#koreanNotebookPanel'),
  koreanVocabCount: $('#koreanVocabCount'),
  koreanVocabSearch: $('#koreanVocabSearch'),
  koreanVocabLessonFilter: $('#koreanVocabLessonFilter'),
  koreanNotebook: $('#koreanNotebook'),
  voiceALabel: $('#voiceALabel'),
  voiceBLabel: $('#voiceBLabel'),
  koreanVoiceHint: $('#koreanVoiceHint'),
};

function loadJsonStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value && typeof value === 'object' ? value : fallback;
  } catch {
    return fallback;
  }
}

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
  language: 'en',
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
  fullArticlePlayback: false,
  koreanContent: getKoreanContent(),
  koreanLessonId: 'KR-R01',
  koreanReview: loadJsonStorage(KOREAN_REVIEW_KEY, {}),
  koreanQuizProgress: loadJsonStorage(KOREAN_QUIZ_KEY, {}),
  koreanQuizSelections: {},
  koreanQuizResult: null,
  pendingKoreanImport: null,
  koreanVocabSearch: '',
  koreanVocabLesson: 'all',
  koreanSection: 'vocabulary',
  koreanWordProgress: loadJsonStorage(KOREAN_WORD_PROGRESS_KEY, {}),
  previousEnglishEngine: 'piper',
};

const ttsManager = new TtsManager({
  onStatus: updateStatus,
  onAudioBlocked: () => showNotice('iOS 阻擋了播放，請先點擊 Enable Piper Audio。', 'warning'),
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

function currentKoreanLesson() {
  return state.koreanContent.lessons.find((lesson) => lesson.id === state.koreanLessonId) || state.koreanContent.lessons[0];
}

function saveKoreanReview() {
  localStorage.setItem(KOREAN_REVIEW_KEY, JSON.stringify(state.koreanReview));
}

function saveKoreanQuizProgress() {
  localStorage.setItem(KOREAN_QUIZ_KEY, JSON.stringify(state.koreanQuizProgress));
}

function recordKoreanWordPractice(id) {
  if (!id) return;
  const previous = state.koreanWordProgress[id] || { plays: 0 };
  state.koreanWordProgress[id] = { plays: previous.plays + 1, lastPlayed: new Date().toISOString() };
  localStorage.setItem(KOREAN_WORD_PROGRESS_KEY, JSON.stringify(state.koreanWordProgress));
}

function koreanEntryForToken(token) {
  const normalized = token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return state.koreanContent.vocabulary.find((entry) => entry.ko === normalized || entry.formInText === normalized);
}

function renderKoreanText(text) {
  return String(text).split(/(\s+)/).map((part) => {
    if (!part.trim()) return part;
    const entry = koreanEntryForToken(part);
    return entry
      ? `<button type="button" class="korean-word" data-vocab-id="${escapeHtml(entry.id)}" title="${escapeHtml(entry.zhTW)}">${escapeHtml(part)}</button>`
      : escapeHtml(part);
  }).join('');
}

function koreanVoices() {
  const native = ttsManager.engines.native;
  native.refreshVoices();
  return native.getVoices().filter((voice) => /^ko(?:-|_)/i.test(voice.lang || ''));
}

async function speakKorean(text, { label = 'Korean speech', vocabId = '' } = {}) {
  // Keep the first speechSynthesis call synchronous with the tap. Awaiting a
  // timer here can lose iOS Safari's user-activation permission.
  const voices = koreanVoices();
  if (!voices.length) {
    const message = '找不到韓文語音。請在裝置的語音／朗讀設定中安裝 Korean 語音，或使用支援韓文的瀏覽器。';
    updateStatus({ key: 'error', label: 'No Korean voice installed', detail: 'SpeechSynthesis ko-KR' });
    showNotice(message, 'warning');
    throw new Error(message);
  }
  ttsManager.stop();
  updateStatus({ key: 'playing', label, detail: voices[0].name });
  try {
    await ttsManager.engines.native.speak(text, {
      voiceName: voices[0].name,
      lang: 'ko-KR',
      rate: Number(elements.rateInput.value) || 1,
    });
    recordKoreanWordPractice(vocabId);
    updateStatus({ key: 'ready', label: 'Korean voice ready', detail: 'Tap any listen button to play again.' });
  } catch (error) {
    updateStatus({ key: 'error', label: 'Korean speech failed', detail: error.message });
    showNotice(`韓文語音播放失敗：${error.message}`, 'error');
    throw error;
  }
}

function koreanSentenceItems(lesson) {
  return (lesson?.paragraphs || []).flatMap((paragraph, paragraphIndex) => {
    const sentences = paragraph.ko.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph.ko];
    return sentences.map((ko, sentenceIndex) => ({ ko: ko.trim(), paragraphIndex, sentenceIndex, zh: paragraph.zh }));
  });
}

function reviewKoreanEntry(id) {
  state.koreanReview[id] = state.koreanReview[id] === '已複習' ? '需複習' : '已複習';
  saveKoreanReview();
  renderKoreanReader();
  renderKoreanNotebook();
}

function renderKoreanVocabularyPractice(lesson) {
  const entries = (lesson.vocabularyIds || []).map((id) => state.koreanContent.vocabulary.find((entry) => entry.id === id)).filter(Boolean);
  elements.reader.innerHTML = `<div class="korean-practice-heading"><div><span class="article-index">${escapeHtml(lesson.id)} · VOCABULARY PRACTICE</span><h3>單字複習</h3><p>${escapeHtml(lesson.titleKo)} · ${entries.length} words</p></div><button class="primary-button" type="button" data-korean-play-vocabulary>▶ Play lesson words</button></div><p class="field-hint korean-practice-hint">Repeats per item 使用右側設定。每次播放會保存單字的練習次數與最後練習時間。</p><div class="korean-practice-list">${entries.map((entry) => {
    const status = state.koreanReview[entry.id] || '未複習';
    const progress = state.koreanWordProgress[entry.id] || {};
    return `<article class="korean-practice-card ${status === '已複習' ? 'is-reviewed' : ''}" data-practice-entry-id="${escapeHtml(entry.id)}"><div class="korean-vocab-heading"><div><h3 lang="ko">${escapeHtml(entry.ko)}</h3><p>${escapeHtml(entry.formInText || '')} · ${escapeHtml(entry.zhTW)}</p></div><span class="review-pill ${status === '已複習' ? 'is-reviewed' : ''}">${escapeHtml(status)}</span></div><p class="korean-example" lang="ko">${escapeHtml(entry.exampleKo)}</p><p class="korean-example-zh">${escapeHtml(entry.exampleZhTW || '')}</p><div class="korean-practice-meta">Played ${progress.plays || 0} times${progress.lastPlayed ? ` · Last ${new Date(progress.lastPlayed).toLocaleString()}` : ''}</div><div class="korean-vocab-actions"><button class="secondary-button" type="button" data-korean-word-listen="${escapeHtml(entry.id)}">▶ Listen</button><button class="secondary-button" type="button" data-korean-word-review="${escapeHtml(entry.id)}">${status === '已複習' ? 'Mark needs review' : 'Mark reviewed'}</button></div></article>`;
  }).join('')}</div>`;
  elements.reader.querySelector('[data-korean-play-vocabulary]')?.addEventListener('click', () => playKoreanSession());
  elements.reader.querySelectorAll('[data-korean-word-listen]').forEach((button) => button.addEventListener('click', () => {
    const entry = entries.find((candidate) => candidate.id === button.dataset.koreanWordListen);
    if (entry) speakKorean(entry.exampleKo, { label: `${entry.ko} example`, vocabId: entry.id }).catch(() => {});
  }));
  elements.reader.querySelectorAll('[data-korean-word-review]').forEach((button) => button.addEventListener('click', () => reviewKoreanEntry(button.dataset.koreanWordReview)));
}

function renderKoreanSentences(lesson) {
  const sentences = koreanSentenceItems(lesson);
  elements.reader.innerHTML = `<div class="korean-practice-heading"><div><span class="article-index">${escapeHtml(lesson.id)} · SENTENCE PRACTICE</span><h3>句子練習</h3><p>逐句聽讀；可用右側 repeat 設定重複播放。</p></div><button class="primary-button" type="button" data-korean-play-sentences>▶ Play sentences</button></div><div class="korean-sentence-list">${sentences.map((sentence, index) => `<article class="korean-sentence-card ${index === state.currentIndex ? 'is-current' : ''}"><div class="korean-paragraph-top"><span class="article-index">Sentence ${index + 1} · Paragraph ${sentence.paragraphIndex + 1}</span><button class="text-button" type="button" data-korean-sentence-listen="${index}">▶ Listen</button></div><p class="korean-text" lang="ko">${renderKoreanText(sentence.ko)}</p><p class="korean-translation">${escapeHtml(sentence.zh)}</p></article>`).join('')}</div>`;
  elements.reader.querySelector('[data-korean-play-sentences]')?.addEventListener('click', () => playKoreanSession());
  elements.reader.querySelectorAll('[data-korean-sentence-listen]').forEach((button) => button.addEventListener('click', () => {
    const sentence = sentences[Number(button.dataset.koreanSentenceListen)];
    if (sentence) {
      state.currentIndex = Number(button.dataset.koreanSentenceListen);
      renderProgress();
      speakKorean(sentence.ko, { label: `Sentence ${state.currentIndex + 1}` }).catch(() => {});
    }
  }));
  elements.reader.querySelectorAll('[data-vocab-id]').forEach((button) => button.addEventListener('click', () => focusKoreanVocabulary(button.dataset.vocabId)));
}

function renderKoreanReader() {
  const lesson = currentKoreanLesson();
  if (!lesson) {
    elements.reader.innerHTML = '<div class="empty-reader"><strong>No Korean lessons</strong><p>Import a Korean lesson JSON bundle to begin.</p></div>';
    return;
  }
  if (state.koreanSection === 'vocabulary') {
    renderKoreanVocabularyPractice(lesson);
    return;
  }
  if (state.koreanSection === 'sentences') {
    renderKoreanSentences(lesson);
    return;
  }
  elements.reader.innerHTML = `
    <div class="korean-lesson-heading">
      <div><span class="article-index">${escapeHtml(lesson.id)} · ${escapeHtml(lesson.level)}</span><h3>${escapeHtml(lesson.titleKo)}</h3><p>${escapeHtml(lesson.titleZh)}</p></div>
      <button class="secondary-button" type="button" data-korean-speak-lesson="${escapeHtml(lesson.id)}">▶ Listen all</button>
    </div>
    <p class="field-hint korean-source-note">${escapeHtml(lesson.sourceType)} · ${lesson.isTextbookVerbatim ? 'Textbook source' : 'Generated study material, not textbook verbatim'}</p>
    <div class="korean-paragraph-list">${lesson.paragraphs.map((paragraph, index) => `
      <article class="korean-paragraph ${index === state.currentIndex ? 'is-current' : ''}" data-index="${index}">
        <div class="korean-paragraph-top"><span class="article-index">Paragraph ${index + 1}</span><button class="text-button" type="button" data-korean-speak-paragraph="${index}">▶ Listen</button></div>
        <p class="korean-text" lang="ko">${renderKoreanText(paragraph.ko)}</p>
        <button class="text-button translation-toggle" type="button" data-translation="${index}">Show Traditional Chinese</button>
        <p class="korean-translation is-hidden" data-translation-text="${index}">${escapeHtml(paragraph.zh)}</p>
      </article>`).join('')}</div>`;
  elements.reader.querySelectorAll('[data-translation]').forEach((button) => button.addEventListener('click', () => {
    const translation = elements.reader.querySelector(`[data-translation-text="${button.dataset.translation}"]`);
    const isHidden = translation.classList.toggle('is-hidden');
    button.textContent = isHidden ? 'Show Traditional Chinese' : 'Hide Traditional Chinese';
  }));
  elements.reader.querySelectorAll('[data-vocab-id]').forEach((button) => button.addEventListener('click', () => focusKoreanVocabulary(button.dataset.vocabId)));
  elements.reader.querySelectorAll('[data-korean-speak-paragraph]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    state.currentIndex = Number(button.dataset.koreanSpeakParagraph);
    renderProgress();
    speakKorean(lesson.paragraphs[state.currentIndex].ko, { label: `Paragraph ${state.currentIndex + 1}` }).catch(() => {});
  }));
  elements.reader.querySelector('[data-korean-speak-lesson]')?.addEventListener('click', () => speakKorean(lesson.textKo, { label: 'Korean lesson' }).catch(() => {}));
}

function renderKoreanQuiz() {
  const lesson = currentKoreanLesson();
  const questions = lesson?.questions || [];
  elements.quizPanel.classList.toggle('is-hidden', !questions.length);
  if (!questions.length) return;
  elements.showAnswersButton.classList.add('is-hidden');
  elements.quizPanel.querySelector('.eyebrow').textContent = 'KOREAN COMPREHENSION';
  elements.quizPanel.querySelector('#quizTitle').textContent = `${lesson.id} · ${questions.length} questions`;
  const progress = state.koreanQuizProgress[lesson.id] || { firstAttempt: null, repeats: [] };
  const result = state.koreanQuizResult;
  elements.quizList.innerHTML = questions.map((question, questionIndex) => {
    const selected = state.koreanQuizSelections[questionIndex];
    const resultAnswer = result?.answers?.[questionIndex];
    const shownAnswer = result ? resultAnswer : selected;
    const feedback = result ? (resultAnswer === question.correctIndex ? 'Correct' : `Answer: ${String.fromCharCode(65 + question.correctIndex)}`) : '';
    return `<article class="quiz-question"><p><strong>${questionIndex + 1}.</strong> ${escapeHtml(question.promptZh)}</p><div class="quiz-options">${question.optionsZh.map((option, optionIndex) => `<button class="quiz-option ${shownAnswer === optionIndex ? 'is-selected' : ''} ${result && optionIndex === question.correctIndex ? 'is-answer' : ''}" type="button" data-korean-question="${questionIndex}" data-korean-option="${optionIndex}" ${result ? 'disabled' : ''}>${String.fromCharCode(65 + optionIndex)}. ${escapeHtml(option)}</button>`).join('')}</div>${feedback ? `<p class="quiz-feedback ${resultAnswer === question.correctIndex ? 'is-correct' : 'is-wrong'}">${feedback}</p>` : ''}</article>`;
  }).join('') + `<div class="korean-quiz-submit"><button class="primary-button" id="submitKoreanQuizButton" type="button" ${result || Object.keys(state.koreanQuizSelections).length !== questions.length ? 'disabled' : ''}>${result ? 'Submitted' : 'Submit answers'}</button>${result ? `<p class="quiz-feedback ${result.score === questions.length ? 'is-correct' : ''}">Score: ${result.score}/${questions.length}. First attempt: ${progress.firstAttempt?.score ?? '—'}/${questions.length}; repeats: ${progress.repeats?.length || 0}.</p>` : '<p class="field-hint">Choose all answers, then submit to grade. Attempts are stored separately.</p>'}</div>`;
  elements.quizList.querySelectorAll('[data-korean-question]').forEach((button) => button.addEventListener('click', () => {
    state.koreanQuizSelections[button.dataset.koreanQuestion] = Number(button.dataset.koreanOption);
    renderKoreanQuiz();
  }));
  elements.quizList.querySelector('#submitKoreanQuizButton')?.addEventListener('click', submitKoreanQuiz);
}

function submitKoreanQuiz() {
  const lesson = currentKoreanLesson();
  if (!lesson || lesson.questions.some((question, index) => state.koreanQuizSelections[index] === undefined)) return;
  const answers = { ...state.koreanQuizSelections };
  const score = lesson.questions.reduce((sum, question, index) => sum + (answers[index] === question.correctIndex ? 1 : 0), 0);
  const previous = state.koreanQuizProgress[lesson.id] || { firstAttempt: null, repeats: [] };
  const attempt = { answers, score, submittedAt: new Date().toISOString() };
  if (previous.firstAttempt) previous.repeats = [...(previous.repeats || []), attempt];
  else previous.firstAttempt = attempt;
  state.koreanQuizProgress[lesson.id] = previous;
  state.koreanQuizResult = attempt;
  saveKoreanQuizProgress();
  renderKoreanQuiz();
  showNotice(`韓文測驗完成：${score}/${lesson.questions.length}。第一次與重做結果會分開保存。`, score === lesson.questions.length ? 'success' : 'info');
}

function focusKoreanVocabulary(id) {
  const entry = state.koreanContent.vocabulary.find((candidate) => candidate.id === id);
  if (!entry) return;
  state.koreanVocabSearch = entry.ko;
  elements.koreanVocabSearch.value = entry.ko;
  renderKoreanNotebook();
  elements.koreanNotebook.querySelector(`[data-entry-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderKoreanNotebook() {
  const search = state.koreanVocabSearch.trim().toLowerCase();
  const entries = state.koreanContent.vocabulary.filter((entry) => {
    const lessonMatch = state.koreanVocabLesson === 'all' || entry.lessonIds?.includes(state.koreanVocabLesson);
    const searchMatch = !search || [entry.ko, entry.formInText, entry.zhTW, entry.exampleKo, entry.sourceLabel].some((value) => String(value || '').toLowerCase().includes(search));
    return lessonMatch && searchMatch;
  });
  elements.koreanVocabCount.textContent = `${entries.length}/${state.koreanContent.vocabulary.length}`;
  elements.koreanNotebook.innerHTML = entries.length ? entries.map((entry) => {
    const status = state.koreanReview[entry.id] || '未複習';
    const reviewed = status === '已複習';
    const lessonLabels = (entry.lessonIds || []).join(', ');
    const naverUrl = `https://korean.dict.naver.com/koendict/#/search?query=${encodeURIComponent(entry.ko)}`;
    return `<article class="korean-vocab-card" data-entry-id="${escapeHtml(entry.id)}"><div class="korean-vocab-heading"><div><h3 lang="ko">${escapeHtml(entry.ko)}</h3><p>${escapeHtml(entry.formInText || '')} · ${escapeHtml(entry.zhTW)}</p></div><span class="review-pill ${reviewed ? 'is-reviewed' : ''}">${escapeHtml(status)}</span></div><p class="korean-example" lang="ko">${escapeHtml(entry.exampleKo)}</p><p class="korean-example-zh">${escapeHtml(entry.exampleZhTW || '')}</p><p class="field-hint">${escapeHtml(entry.partOfSpeechZh || '')} · ${escapeHtml(entry.sourceLabel || '')} · ${escapeHtml(lessonLabels)}</p><div class="korean-vocab-actions"><button class="secondary-button" type="button" data-vocab-listen="${escapeHtml(entry.id)}">▶ Listen</button><button class="secondary-button" type="button" data-vocab-review="${escapeHtml(entry.id)}">${reviewed ? 'Mark needs review' : 'Mark reviewed'}</button><a class="secondary-button" href="${naverUrl}" target="_blank" rel="noopener noreferrer">Naver Dictionary</a></div>${entry.learningNoteZh ? `<p class="field-hint">Note: ${escapeHtml(entry.learningNoteZh)}</p>` : ''}</article>`;
  }).join('') : '<p class="empty-state">No matching Korean vocabulary.</p>';
  elements.koreanNotebook.querySelectorAll('[data-vocab-listen]').forEach((button) => button.addEventListener('click', () => {
    const entry = state.koreanContent.vocabulary.find((candidate) => candidate.id === button.dataset.vocabListen);
    if (entry) speakKorean(entry.exampleKo, { label: `${entry.ko} example` }).catch(() => {});
  }));
  elements.koreanNotebook.querySelectorAll('[data-vocab-review]').forEach((button) => button.addEventListener('click', () => {
    reviewKoreanEntry(button.dataset.vocabReview);
  }));
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
  if (state.language === 'ko') {
    renderKoreanReader();
    renderKoreanQuiz();
    renderKoreanNotebook();
  } else {
    renderReader();
    renderQuiz();
  }
  renderProgress();
  renderWeakWords();
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
    const isCurrent = state.fullArticlePlayback && item.type === 'article' ? true : index === state.currentIndex;
    card.className = `reader-item ${isCurrent ? 'is-current' : ''} ${item.type === 'dialog' ? `speaker-${item.speaker.toLowerCase()}` : ''} ${item.type === 'article' ? 'article-item' : ''}`;
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
  if (state.language === 'ko') {
    const lesson = currentKoreanLesson();
    const total = state.koreanSection === 'vocabulary'
      ? lesson?.vocabularyIds?.length || 0
      : state.koreanSection === 'sentences'
        ? koreanSentenceItems(lesson).length
        : lesson?.paragraphs?.length || 0;
    const current = total ? Math.min(state.currentIndex + 1, total) : 0;
    elements.progressLabel.textContent = `${current} / ${total}`;
    elements.progressBar.style.width = `${total ? (current / total) * 100 : 0}%`;
    const label = state.koreanSection === 'vocabulary' ? 'Word' : state.koreanSection === 'sentences' ? 'Sentence' : 'Paragraph';
    elements.currentLabel.textContent = lesson ? `${lesson.id} · ${label} ${current || 1}` : 'Choose a Korean lesson';
    return;
  }
  const items = visibleItems();
  if (state.fullArticlePlayback && state.mode === 'article') {
    elements.progressLabel.textContent = 'Full article';
    elements.progressBar.style.width = '0%';
    elements.currentLabel.textContent = `Full article · ${items.length} sentences`;
    return;
  }
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
  elements.showAnswersButton.classList.remove('is-hidden');
  elements.quizPanel.querySelector('.eyebrow').textContent = 'CHECK YOUR READING';
  elements.quizPanel.querySelector('#quizTitle').textContent = 'Quick quiz';
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
  const isKorean = state.language === 'ko';
  const isArticle = state.mode === 'article';
  elements.articleFields.classList.toggle('is-hidden', !isArticle || isKorean);
  elements.koreanFields.classList.toggle('is-hidden', !isKorean);
  elements.weakPanel.classList.toggle('is-hidden', isKorean || state.mode !== 'word');
  elements.koreanNotebookPanel.classList.toggle('is-hidden', !isKorean);
  elements.contentInput.classList.toggle('is-hidden', isKorean);
  elements.contentInput.previousElementSibling.classList.toggle('is-hidden', isKorean);
  elements.contentHint.classList.toggle('is-hidden', isKorean);
  elements.loadContentButton.classList.toggle('is-hidden', isKorean);
  elements.sampleButton.classList.toggle('is-hidden', isKorean);
  document.querySelector('.mode-tabs').classList.toggle('is-hidden', isKorean);
  elements.koreanModeTabs.classList.toggle('is-hidden', !isKorean);
  elements.contentInput.previousElementSibling.textContent = isArticle ? 'Article text' : 'Paste lines';
  elements.contentHint.textContent = state.mode === 'word' ? 'Word mode: word | pronunciation | meaning | example' : state.mode === 'dialog' ? 'Dialog mode: one line per turn, e.g. A: Hello there.' : 'Article mode: paste paragraphs; the reader will split them into sentences.';
  elements.loadContentButton.textContent = isArticle ? 'Load article' : 'Load content';
}

function setKoreanSection(section) {
  if (!['vocabulary', 'sentences', 'article'].includes(section)) return;
  stopPlayback(false);
  state.koreanSection = section;
  state.currentIndex = 0;
  document.querySelectorAll('[data-korean-section]').forEach((button) => {
    const active = button.dataset.koreanSection === section;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  renderAll();
}

function updateEngineFields() {
  const isPiper = elements.engineSelect.value === 'piper';
  const isKorean = state.language === 'ko';
  elements.browserVoiceFields.classList.toggle('is-hidden', isPiper);
  elements.piperVoiceFields.classList.toggle('is-hidden', !isPiper);
  elements.koreanVoiceHint.classList.toggle('is-hidden', !isKorean || isPiper);
  elements.voiceALabel.textContent = isKorean ? 'Korean Voice A' : 'Voice A';
  elements.voiceBLabel.textContent = isKorean ? 'Korean Voice B' : 'Voice B';
  if (isPiper) {
    const enabled = ttsManager.isAudioReady();
    elements.enablePiperAudioButton.textContent = enabled ? 'Piper Audio Enabled' : 'Enable Piper Audio';
    elements.piperAudioHint.textContent = enabled
      ? 'Audio is enabled. Press Play to lazy-load the WASM voice.'
      : 'Tap once to unlock iPhone audio. The model still loads only when you press Play.';
    elements.quickEnablePiperButton.classList.toggle('is-hidden', enabled);
  } else {
    elements.quickEnablePiperButton.classList.add('is-hidden');
  }
  updatePlayerControls();
}

function updateStatus(status = {}) {
  state.statusKey = status.key || state.statusKey;
  const detail = status.detail ? ` · ${status.detail}` : '';
  elements.statusText.textContent = `${status.label || 'Ready'}${detail}`;
  elements.statusDot.dataset.status = state.statusKey;
  const hasProgress = Number.isFinite(status.progress);
  const showProgress = status.key === 'loading' || (status.key === 'generating' && hasProgress);
  elements.modelProgress.classList.toggle('is-hidden', !showProgress);
  elements.modelProgressBar.style.width = hasProgress ? `${status.progress}%` : '0%';
  updatePlayerControls();
}

function speechSettingControls() {
  return [
    elements.engineSelect,
    elements.voiceASelect,
    elements.voiceBSelect,
    elements.piperVoiceSelect,
    elements.rateInput,
    elements.delayInput,
    elements.repeatInput,
    elements.articlePlaybackSelect,
  ];
}

function closePiperErrorDialog() {
  if (!elements.piperErrorDialog.open) return;
  if (typeof elements.piperErrorDialog.close === 'function') elements.piperErrorDialog.close();
  else elements.piperErrorDialog.removeAttribute('open');
}

function showPiperErrorDialog(error) {
  const message = error?.message || 'Piper could not load or play this audio.';
  elements.piperErrorMessage.textContent = message;
  elements.retryPiperButton.textContent = isPiperBlockedError(error) ? 'Enable Piper again' : 'Keep Piper and retry';
  if (elements.piperErrorDialog.open) return;
  if (typeof elements.piperErrorDialog.showModal === 'function') elements.piperErrorDialog.showModal();
  else elements.piperErrorDialog.setAttribute('open', '');
}

function showNotice(message, type = 'info') {
  elements.notice.textContent = message;
  elements.notice.dataset.type = type;
  elements.notice.classList.add('is-visible');
  window.clearTimeout(showNotice.timeout);
  showNotice.timeout = window.setTimeout(() => elements.notice.classList.remove('is-visible'), 7000);
}

function getVoiceFor(item) {
  if (elements.engineSelect.value === 'piper') return elements.piperVoiceSelect.value;
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

function updateKoreanLessonOptions() {
  const lessons = state.koreanContent.lessons;
  if (!lessons.some((lesson) => lesson.id === state.koreanLessonId)) state.koreanLessonId = lessons[0]?.id || '';
  elements.koreanLessonSelect.innerHTML = lessons.map((lesson) => `<option value="${escapeHtml(lesson.id)}">${escapeHtml(lesson.id)} · ${escapeHtml(lesson.titleKo)} · ${escapeHtml(lesson.titleZh)}</option>`).join('');
  elements.koreanLessonSelect.value = state.koreanLessonId;
  const lesson = currentKoreanLesson();
  elements.koreanLessonHint.textContent = lesson ? `${lesson.sourceType} · ${lesson.paragraphs.length} paragraphs · ${lesson.questions.length} questions · ${lesson.vocabularyIds?.length || 0} linked vocabulary items` : 'Import a Korean lesson JSON bundle to begin.';
  elements.koreanVocabLessonFilter.innerHTML = `<option value="all">All lessons</option>${lessons.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.id)} · ${escapeHtml(item.titleKo)}</option>`).join('')}`;
  elements.koreanVocabLessonFilter.value = state.koreanVocabLesson;
}

function loadKoreanLesson() {
  const lesson = currentKoreanLesson();
  if (!lesson) return;
  stopPlayback(false);
  state.currentIndex = 0;
  state.koreanQuizSelections = {};
  state.koreanQuizResult = null;
  state.items = lesson.paragraphs.map((paragraph, index) => ({ id: `${lesson.id}-P${index + 1}`, type: 'korean', text: paragraph.ko, label: `Paragraph ${index + 1}` }));
  elements.sessionTitle.textContent = `${lesson.titleKo} · ${lesson.titleZh}`;
  renderAll();
  showNotice(`${lesson.id} loaded · ${lesson.paragraphs.length} paragraphs · ${lesson.questions.length} questions`, 'success');
}

function showKoreanImportPreview(result, fileName) {
  const collisionHint = result.warnings.length ? `<br><small>${result.warnings.map((warning) => escapeHtml(warning)).join('<br>')}</small>` : '';
  elements.koreanImportPreview.classList.remove('is-hidden');
  elements.koreanImportPreview.dataset.type = result.ok ? 'success' : 'error';
  elements.koreanImportPreview.innerHTML = result.ok
    ? `<strong>${escapeHtml(fileName)} is ready to import.</strong><br>${result.summary.lessons} lessons · ${result.summary.vocabulary} vocabulary · ${result.summary.questions} questions${collisionHint}`
    : `<strong>Import rejected.</strong><br>${result.errors.map((error) => escapeHtml(error)).join('<br>')}${collisionHint}`;
  elements.confirmKoreanImportButton.disabled = !result.ok;
}

async function previewKoreanImport() {
  const file = elements.koreanFileInput.files?.[0];
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (error) {
    showKoreanImportPreview({ ok: false, errors: [`Invalid JSON: ${error.message}`], warnings: [], summary: {} }, file.name);
    return;
  }
  const knownVocabularyIds = new Set(state.koreanContent.vocabulary.map((entry) => entry.id));
  const result = validateKoreanBundle(parsed, { knownVocabularyIds, allowPartial: true });
  state.pendingKoreanImport = result.ok ? { lessons: result.lessons, vocabulary: result.vocabulary } : null;
  showKoreanImportPreview(result, file.name);
}

function confirmKoreanImport() {
  if (!state.pendingKoreanImport) return;
  const imported = JSON.parse(localStorage.getItem(KOREAN_CONTENT_STORAGE_KEY) || '{"schemaVersion":1,"lessons":[],"vocabulary":[]}');
  const merged = mergeKoreanContent(imported, state.pendingKoreanImport);
  if (merged.collisions.length) {
    showNotice(`Import stopped: ${merged.collisions.join(' ')}`, 'error');
    return;
  }
  saveImportedKoreanContent(merged);
  state.koreanContent = getKoreanContent();
  state.pendingKoreanImport = null;
  elements.koreanFileInput.value = '';
  elements.koreanImportPreview.classList.add('is-hidden');
  elements.confirmKoreanImportButton.disabled = true;
  updateKoreanLessonOptions();
  loadKoreanLesson();
  showNotice(`Korean import complete · ${merged.lessons.length} new/kept lessons · ${merged.vocabulary.length} new/kept vocabulary entries. Progress was preserved.`, 'success');
}

function downloadText(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportKoreanTsv() {
  const header = ['id', 'ko', 'formInText', 'zhTW', 'exampleKo', 'exampleZhTW', 'sourceLabel', 'lessonIds'];
  const rows = state.koreanContent.vocabulary.map((entry) => header.map((key) => Array.isArray(entry[key]) ? entry[key].join(', ') : String(entry[key] || '').replace(/\t|\n/g, ' ')).join('\t'));
  downloadText('korean-vocabulary.tsv', [header.join('\t'), ...rows].join('\n'), 'text/tab-separated-values;charset=utf-8');
}

async function playKoreanSession() {
  const lesson = currentKoreanLesson();
  if (!lesson || state.isPlaying) return;
  const wordEntries = state.koreanSection === 'vocabulary'
    ? (lesson.vocabularyIds || []).map((id) => state.koreanContent.vocabulary.find((entry) => entry.id === id)).filter(Boolean)
    : [];
  const sentenceItems = state.koreanSection === 'sentences' ? koreanSentenceItems(lesson) : [];
  const items = state.koreanSection === 'vocabulary'
    ? wordEntries.map((entry) => ({ text: entry.exampleKo, label: `${entry.ko} example`, vocabId: entry.id }))
    : state.koreanSection === 'sentences'
      ? sentenceItems.map((sentence, index) => ({ text: sentence.ko, label: `Sentence ${index + 1}` }))
      : lesson.paragraphs.map((paragraph, index) => ({ text: paragraph.ko, label: `Paragraph ${index + 1}` }));
  if (!items.length) return;
  state.isPlaying = true;
  state.isPaused = false;
  const token = ++state.playToken;
  updatePlayerControls();
  try {
    for (let index = state.currentIndex; index < items.length; index += 1) {
      if (!state.isPlaying || token !== state.playToken) return;
      state.currentIndex = index;
      renderKoreanReader();
      renderProgress();
      for (let repeat = 0; repeat < Number(elements.repeatInput.value); repeat += 1) {
        if (!state.isPlaying || token !== state.playToken) return;
        await speakKorean(items[index].text, { label: items[index].label, vocabId: items[index].vocabId });
      }
      await sessionDelay(Number(elements.delayInput.value) * 1000, token);
    }
    updateStatus({ key: 'ready', label: 'Korean lesson complete', detail: 'Nice work.' });
  } catch {
    // speakKorean has already surfaced the actionable voice error.
  } finally {
    if (token === state.playToken) {
      state.isPlaying = false;
      state.isPaused = false;
      updatePlayerControls();
    }
  }
}

function isPiperBlockedError(error) {
  return error?.code === 'PIPER_AUDIO_NOT_ENABLED' || error?.name === 'NotAllowedError';
}

async function enablePiperAudio() {
  const originalLabel = elements.enablePiperAudioButton.textContent;
  elements.enablePiperAudioButton.disabled = true;
  elements.enablePiperAudioButton.textContent = 'Enabling audio…';
  elements.quickEnablePiperButton.disabled = true;
  elements.quickEnablePiperButton.textContent = 'Enabling Piper audio…';
  try {
    await ttsManager.enableAudio();
    updateStatus({ key: 'ready', label: 'Piper audio enabled', detail: 'Ready to load the voice when you press Play.' });
    elements.piperAudioHint.textContent = 'Audio is enabled. Press Play to lazy-load the WASM voice.';
    showNotice('Piper 音訊已啟用，現在可以按 Play 載入本地語音。', 'success');
  } catch (error) {
    if (isPiperBlockedError(error)) {
      updateStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error.message });
      showNotice('iOS 沒有允許音訊啟用，請直接再點一次 Enable Piper Audio。', 'warning');
    } else {
      updateStatus({ key: 'error', label: 'Piper audio could not be enabled', detail: error.message });
      showNotice(`Piper 音訊啟用失敗：${error.message}`, 'error');
    }
  } finally {
    if (!ttsManager.isAudioReady()) elements.enablePiperAudioButton.textContent = originalLabel;
    elements.quickEnablePiperButton.textContent = 'Enable Piper Audio';
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
  if (state.language === 'ko') {
    await playKoreanSession();
    return;
  }
  const items = visibleItems();
  if (!items.length) {
    showNotice('There is nothing to play yet.', 'warning');
    return;
  }
  if (state.isPlaying) return;
  if (elements.engineSelect.value === 'piper' && !ttsManager.isAudioReady()) {
    updateStatus({ key: 'not-enabled', label: 'Piper audio not enabled', detail: 'Tap Enable Piper Audio first.' });
    showNotice('請先點擊 Enable Piper Audio，再按 Play。', 'warning');
    return;
  }

  state.isPlaying = true;
  state.isPaused = false;
  const continuousArticle = state.mode === 'article' && elements.articlePlaybackSelect.value === 'continuous';
  state.fullArticlePlayback = continuousArticle;
  if (continuousArticle) state.currentIndex = 0;
  const token = ++state.playToken;
  updatePlayerControls();
  try {
    if (continuousArticle) {
      const segments = items.map((item) => item.text);
      const fullText = segments.join(' ');
      renderReader();
      renderProgress();
      for (let repeat = 0; repeat < Number(elements.repeatInput.value); repeat += 1) {
        if (!state.isPlaying || token !== state.playToken) return;
        await ttsManager.speak(fullText, {
          voiceName: getVoiceFor(items[0]),
          rate: Number(elements.rateInput.value),
          segments,
        });
      }
      if (!state.isPlaying || token !== state.playToken) return;
      state.currentIndex = items.length - 1;
      state.isPlaying = false;
      state.fullArticlePlayback = false;
      renderReader();
      renderProgress();
      updateStatus({ key: 'ready', label: 'Full article complete', detail: 'Continuous playback finished.' });
      return;
    }

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
      state.fullArticlePlayback = false;
      renderReader();
      renderProgress();
      if (isPiperBlockedError(error)) {
        updateStatus({ key: 'blocked', label: 'Playback blocked by iOS', detail: error?.message || 'Tap Enable Piper Audio.' });
        showNotice('播放被 iOS 阻擋。請在視窗中重新啟用 Piper，或自行選擇 Browser Voice。', 'warning');
        showPiperErrorDialog(error);
      } else if (elements.engineSelect.value === 'piper') {
        updateStatus({ key: 'error', label: 'Piper could not play', detail: error?.message || 'Retry or choose Browser Voice.' });
        showPiperErrorDialog(error);
      } else {
        updateStatus({ key: 'error', label: 'Browser voice error', detail: error?.message || 'Speech failed.' });
        showNotice(error?.message || 'Browser Voice could not play.', 'error');
      }
    }
  } finally {
    if (token === state.playToken) {
      state.isPlaying = false;
      state.isPaused = false;
      state.fullArticlePlayback = false;
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
  const wasFullArticle = state.fullArticlePlayback;
  state.playToken += 1;
  state.isPlaying = false;
  state.isPaused = false;
  state.fullArticlePlayback = false;
  ttsManager.stop();
  if (showStatus) updateStatus({ key: 'stopped', label: 'Stopped' });
  if (wasFullArticle) {
    renderReader();
    renderProgress();
  }
  updatePlayerControls();
}

function stepItem(direction) {
  const items = visibleItems();
  if (!items.length) return;
  stopPlayback(false);
  state.currentIndex = (state.currentIndex + direction + items.length) % items.length;
  renderAll();
}

function setLanguage(language) {
  if (language === state.language) return;
  stopPlayback(false);
  if (language === 'ko') {
    state.previousEnglishEngine = elements.engineSelect.value;
    state.language = 'ko';
    state.mode = 'article';
    elements.engineSelect.value = 'native';
    ttsManager.setEngine('native');
    populateNativeVoices();
    updateKoreanLessonOptions();
    loadKoreanLesson();
  } else {
    state.language = 'en';
    elements.engineSelect.value = state.previousEnglishEngine || 'piper';
    ttsManager.setEngine(elements.engineSelect.value);
    populateNativeVoices();
    loadArticleSample();
  }
  renderAll();
  updateEngineFields();
}

function updatePlayerControls() {
  const isKorean = state.language === 'ko';
  const isPiper = elements.engineSelect.value === 'piper';
  const audioReady = isKorean || !isPiper || ttsManager.isAudioReady();
  const hasItems = isKorean ? Boolean(currentKoreanLesson()?.paragraphs?.length) : visibleItems().length > 0;
  const busyBeforePlayback = ['loading', 'generating', 'enabling'].includes(state.statusKey);
  const settingsLocked = state.isPlaying;

  elements.playIcon.textContent = '▶';
  elements.playText.textContent = 'Play';
  elements.playButton.setAttribute('aria-label', audioReady ? 'Play current item' : 'Enable Piper Audio before playback');
  elements.playButton.disabled = settingsLocked || !audioReady || !hasItems;
  elements.pauseButton.textContent = state.isPaused ? 'Resume' : 'Pause';
  elements.pauseButton.setAttribute('aria-label', state.isPaused ? 'Resume playback' : 'Pause playback');
  elements.pauseButton.disabled = !state.isPlaying || (!state.isPaused && busyBeforePlayback);
  elements.stopButton.disabled = !state.isPlaying;
  elements.settingsLockHint.classList.toggle('is-hidden', !settingsLocked);
  speechSettingControls().forEach((control) => { control.disabled = settingsLocked; });
  elements.enablePiperAudioButton.disabled = settingsLocked || isKorean || !isPiper || ttsManager.isAudioReady() || state.statusKey === 'enabling';
  elements.quickEnablePiperButton.disabled = settingsLocked || isKorean || !isPiper || ttsManager.isAudioReady() || state.statusKey === 'enabling';
}

function populateNativeVoices() {
  const allVoices = ttsManager.engines.native.getVoices();
  const voices = state.language === 'ko'
    ? allVoices.filter((voice) => /^ko(?:-|_)/i.test(voice.lang || ''))
    : allVoices;
  const currentA = elements.voiceASelect.value;
  const currentB = elements.voiceBSelect.value;
  const options = voices.length
    ? voices
    : [{ name: '', label: state.language === 'ko' ? 'No Korean voice installed' : 'System default voice' }];
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
elements.languageSelect.addEventListener('change', () => setLanguage(elements.languageSelect.value));
elements.loadKoreanLessonButton.addEventListener('click', () => loadKoreanLesson());
elements.koreanLessonSelect.addEventListener('change', () => {
  state.koreanLessonId = elements.koreanLessonSelect.value;
  loadKoreanLesson();
});
elements.importKoreanButton.addEventListener('click', () => elements.koreanFileInput.click());
elements.koreanFileInput.addEventListener('change', () => previewKoreanImport().catch((error) => showNotice(`Korean import failed: ${error.message}`, 'error')));
elements.confirmKoreanImportButton.addEventListener('click', () => confirmKoreanImport());
elements.exportKoreanJsonButton.addEventListener('click', () => downloadText('korean-content.json', exportKoreanContent(state.koreanContent), 'application/json;charset=utf-8'));
elements.exportKoreanTsvButton.addEventListener('click', () => exportKoreanTsv());
elements.koreanVocabSearch.addEventListener('input', () => { state.koreanVocabSearch = elements.koreanVocabSearch.value; renderKoreanNotebook(); });
elements.koreanVocabLessonFilter.addEventListener('change', () => { state.koreanVocabLesson = elements.koreanVocabLessonFilter.value; renderKoreanNotebook(); });
elements.importArticleButton.addEventListener('click', () => elements.articleFileInput.click());
elements.articleFileInput.addEventListener('change', () => importArticleFile().catch((error) => showNotice(`Could not import article: ${error.message}`, 'error')));
elements.generateN8nButton.addEventListener('click', () => generateWithN8n());
elements.enablePiperAudioButton.addEventListener('click', () => enablePiperAudio());
elements.quickEnablePiperButton.addEventListener('click', () => enablePiperAudio());
elements.showAnswersButton.addEventListener('click', () => { state.showAnswers = !state.showAnswers; renderQuiz(); });
elements.engineSelect.addEventListener('change', () => {
  stopPlayback(false);
  if (state.language === 'ko' && elements.engineSelect.value !== 'native') {
    elements.engineSelect.value = 'native';
    showNotice('韓文播放固定使用瀏覽器 SpeechSynthesis（ko-KR）。', 'info');
  }
  ttsManager.setEngine(elements.engineSelect.value);
  updateEngineFields();
  if (elements.engineSelect.value === 'piper') showNotice('請先點擊 Enable Piper Audio，再按 Play 載入本地語音。', 'info');
});
elements.piperErrorDialog.addEventListener('cancel', (event) => event.preventDefault());
elements.retryPiperButton.addEventListener('click', async () => {
  closePiperErrorDialog();
  elements.engineSelect.value = 'piper';
  ttsManager.setEngine('piper');
  updateEngineFields();
  if (!ttsManager.isAudioReady()) await enablePiperAudio();
  if (ttsManager.isAudioReady()) playSession();
});
elements.switchBrowserButton.addEventListener('click', () => {
  closePiperErrorDialog();
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
document.querySelectorAll('[data-korean-section]').forEach((button) => button.addEventListener('click', () => setKoreanSection(button.dataset.koreanSection)));
window.speechSynthesis?.addEventListener?.('voiceschanged', populateNativeVoices);

elements.n8nWebhookInput.value = localStorage.getItem(N8N_WEBHOOK_KEY) || '';
ttsManager.setEngine('piper');
updateKoreanLessonOptions();
updateEngineFields();
loadArticleSample();
populateNativeVoices();
