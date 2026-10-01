import bundledLessons from './korean-lessons.json';
import bundledVocabulary from './korean-vocabulary.json';
import fullContentPack from './korean-content-full.json';

export const KOREAN_SCHEMA_VERSION = 1;
export const KOREAN_CONTENT_STORAGE_KEY = 'vocabulary-reader:korean-content:v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

function sourceLabel(sources = []) {
  return sources.map((source) => source.section ? `Section ${source.section}` : source.kind || '').filter(Boolean).join(' · ') || 'Korean content pack';
}

function posLabel(pos = '') {
  return ({ adjective: '形容詞', adverb: '副詞', determiner: '限定詞', expression: '表現', interjection: '感嘆詞', noun: '名詞', pronoun: '代詞', verb_intransitive: '不及物動詞', verb_transitive: '及物動詞' })[pos] || pos;
}

function normalizeFullBundle(input, { lessonIdMap = {} } = {}) {
  const lessons = Array.isArray(input?.lessons) ? input.lessons : [];
  const sentencePool = lessons.flatMap((lesson) => lesson.sentences || []);
  const vocabulary = (input?.vocabulary || []).map((entry) => {
    const lemma = entry.display || entry.lemma || '';
    const forms = Array.isArray(entry.surface_forms) ? entry.surface_forms : [];
    const example = sentencePool.find((sentence) => [lemma, ...forms].some((form) => form && sentence.text?.includes(form)));
    return {
      id: entry.id,
      ko: lemma,
      zhTW: entry.meaning_zh_tw || '',
      formInText: forms[0] || lemma,
      exampleKo: example?.text || lemma,
      exampleZhTW: '',
      sourceLabel: sourceLabel(entry.sources),
      textbookSections: (entry.sources || []).map((source) => source.section).filter(Boolean),
      topics: entry.topics || [],
      lessonIds: (entry.used_in_readings || []).map((id) => lessonIdMap[id] || id),
      partOfSpeechZh: posLabel(entry.pos),
      learningNoteZh: (entry.topics || []).join(' · '),
      learningState: entry.learning_state || 'textbook_pool',
      sourceId: entry.id,
      surfaceForms: forms,
    };
  });
  return {
    schemaVersion: KOREAN_SCHEMA_VERSION,
    language: 'ko-KR',
    vocabulary,
    lessons: lessons.map((lesson) => {
      const id = lessonIdMap[lesson.id] || lesson.id;
      const paragraphs = String(lesson.text || '').split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean).map((ko) => ({ ko, zh: '' }));
      return {
        id,
        order: lesson.order,
        titleKo: lesson.title_ko || lesson.id,
        titleZh: lesson.title_zh_tw || '',
        sourceType: 'korean_content_pack',
        level: 'A1',
        paragraphs,
        questions: [],
        textKo: lesson.text || paragraphs.map((paragraph) => paragraph.ko).join('\n\n'),
        isTextbookVerbatim: false,
        vocabularyIds: vocabulary.filter((entry) => entry.lessonIds.includes(id)).map((entry) => entry.id),
        sentences: clone(lesson.sentences || []),
      };
    }),
    phrases: clone(input?.phrases || []),
    grammar: clone(input?.grammar || []),
    pronunciationExamples: clone(input?.pronunciation_examples || []),
    pronunciationSentences: (input?.pronunciation_sentences || []).map((item, index) => ({ ...clone(item), id: item.id || `pronunciation-sentence-${index + 1}` })),
    rawReadingSurfaceTokens: clone(input?.raw_reading_surface_tokens || []),
    sourcePolicy: clone(input?.source_policy || {}),
  };
}

function mergeVocabularyByLemma(base, incoming) {
  const result = base.map((entry) => clone(entry));
  incoming.forEach((entry) => {
    const existing = result.find((candidate) => candidate.id === entry.id || candidate.ko === entry.ko);
    if (!existing) {
      result.push(clone(entry));
      return;
    }
    existing.lessonIds = [...new Set([...(existing.lessonIds || []), ...(entry.lessonIds || [])])];
    existing.sourceLabel = existing.sourceLabel || entry.sourceLabel;
    existing.partOfSpeechZh = existing.partOfSpeechZh || entry.partOfSpeechZh;
    existing.learningState = existing.learningState || entry.learningState;
    existing.surfaceForms = [...new Set([...(existing.surfaceForms || []), ...(entry.surfaceForms || [])])];
    existing.textbookSections = [...new Set([...(existing.textbookSections || []), ...(entry.textbookSections || [])])];
    existing.topics = [...new Set([...(existing.topics || []), ...(entry.topics || [])])];
    existing.fullPackId = entry.sourceId || entry.id;
  });
  return result;
}

export function getSeedKoreanContent() {
  const legacyLessons = clone(bundledLessons.lessons);
  const lessonIdMap = {};
  fullContentPack.lessons?.forEach((lesson) => {
    const legacyId = { 'reading-01': 'KR-R01', 'reading-02': 'KR-R02' }[lesson.id];
    lessonIdMap[lesson.id] = legacyId || lesson.id;
  });
  const normalized = normalizeFullBundle(fullContentPack, { lessonIdMap });
  const lessons = [...legacyLessons];
  normalized.lessons.forEach((lesson) => {
    if (!lessons.some((candidate) => candidate.id === lesson.id)) lessons.push(lesson);
  });
  return {
    schemaVersion: KOREAN_SCHEMA_VERSION,
    language: 'ko-KR',
    lessons,
    vocabulary: mergeVocabularyByLemma(clone(bundledVocabulary.vocabulary), normalized.vocabulary),
    phrases: normalized.phrases,
    grammar: normalized.grammar,
    pronunciationExamples: normalized.pronunciationExamples,
    pronunciationSentences: normalized.pronunciationSentences,
    rawReadingSurfaceTokens: normalized.rawReadingSurfaceTokens,
    sourcePolicy: normalized.sourcePolicy,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateUniqueIds(items, label, errors) {
  const seen = new Set();
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim()) {
      errors.push(`${label}[${index}] is missing a stable id.`);
      return;
    }
    if (seen.has(item.id)) errors.push(`${label} contains duplicate id ${item.id}.`);
    seen.add(item.id);
  });
  return seen;
}

export function validateKoreanBundle(input, { knownVocabularyIds = new Set(), allowPartial = false } = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== 'object') return { ok: false, errors: ['The JSON root must be an object.'], warnings };
  const bundle = input.schema_version && Array.isArray(input.lessons) && Array.isArray(input.vocabulary) ? normalizeFullBundle(input) : input;
  if (bundle.schemaVersion !== KOREAN_SCHEMA_VERSION) errors.push(`schemaVersion must be ${KOREAN_SCHEMA_VERSION}.`);
  const lessons = Array.isArray(bundle.lessons) ? bundle.lessons : [];
  const vocabulary = Array.isArray(bundle.vocabulary) ? bundle.vocabulary : Array.isArray(bundle.entries) ? bundle.entries : [];
  if (!allowPartial && !lessons.length && !vocabulary.length) errors.push('The bundle must contain lessons or vocabulary entries.');
  const lessonIds = validateUniqueIds(lessons, 'lessons', errors);
  const vocabularyIds = validateUniqueIds(vocabulary, 'vocabulary', errors);

  lessons.forEach((lesson) => {
    if (!lesson.titleKo?.trim() || !lesson.titleZh?.trim()) errors.push(`${lesson.id || 'Lesson'} needs Korean and Traditional Chinese titles.`);
    if (!lesson.textKo?.trim()) errors.push(`${lesson.id || 'Lesson'} needs nonempty Korean text.`);
    if (!Array.isArray(lesson.paragraphs) || !lesson.paragraphs.length) errors.push(`${lesson.id || 'Lesson'} needs paragraphs.`);
    lesson.paragraphs?.forEach((paragraph, index) => {
      if (!paragraph?.ko?.trim()) errors.push(`${lesson.id || 'Lesson'} paragraph ${index + 1} needs Korean text.`);
    });
    if (!Array.isArray(lesson.questions)) errors.push(`${lesson.id || 'Lesson'} needs a questions array.`);
    lesson.questions?.forEach((question, index) => {
      if (!question?.id || !question.promptZh?.trim()) errors.push(`${lesson.id || 'Lesson'} question ${index + 1} needs an id and promptZh.`);
      if (!Array.isArray(question.optionsZh) || question.optionsZh.length < 2) errors.push(`${question.id || 'Question'} needs at least two options.`);
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= (question.optionsZh?.length || 0)) {
        errors.push(`${question.id || 'Question'} has an invalid correctIndex.`);
      }
    });
    lesson.vocabularyIds?.forEach((id) => {
      if (!vocabularyIds.has(id) && !knownVocabularyIds.has(id)) warnings.push(`${lesson.id} references vocabulary ${id}, which is not in this file.`);
    });
  });

  vocabulary.forEach((entry) => {
    if (!entry.ko?.trim() || !entry.zhTW?.trim() || !entry.exampleKo?.trim()) errors.push(`${entry.id || 'Vocabulary entry'} needs Korean, meaning, and example text.`);
    if (!Array.isArray(entry.lessonIds)) errors.push(`${entry.id || 'Vocabulary entry'} needs lessonIds.`);
    entry.lessonIds?.forEach((id) => {
      if (!lessonIds.has(id) && !input.lessons?.some((lesson) => lesson.id === id)) warnings.push(`${entry.id} references lesson ${id}, which is not in this file.`);
    });
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    lessons,
    vocabulary,
    phrases: bundle.phrases || [],
    grammar: bundle.grammar || [],
    pronunciationExamples: bundle.pronunciationExamples || [],
    pronunciationSentences: bundle.pronunciationSentences || [],
    summary: { lessons: lessons.length, vocabulary: vocabulary.length, questions: lessons.reduce((sum, lesson) => sum + (lesson.questions?.length || 0), 0), phrases: (bundle.phrases || []).length, grammar: (bundle.grammar || []).length, pronunciationExamples: (bundle.pronunciationExamples || []).length },
  };
}

export function loadImportedKoreanContent() {
  try {
    const stored = JSON.parse(localStorage.getItem(KOREAN_CONTENT_STORAGE_KEY) || '{"schemaVersion":1,"lessons":[],"vocabulary":[]}');
    const result = validateKoreanBundle(stored, { allowPartial: true });
    return result.ok ? { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: result.lessons, vocabulary: result.vocabulary, phrases: result.phrases, grammar: result.grammar, pronunciationExamples: result.pronunciationExamples, pronunciationSentences: result.pronunciationSentences } : { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [], phrases: [], grammar: [], pronunciationExamples: [], pronunciationSentences: [] };
  } catch {
    return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [], phrases: [], grammar: [], pronunciationExamples: [], pronunciationSentences: [] };
  }
}

export function saveImportedKoreanContent(content) {
  localStorage.setItem(KOREAN_CONTENT_STORAGE_KEY, JSON.stringify({
    schemaVersion: KOREAN_SCHEMA_VERSION,
    lessons: content.lessons,
    vocabulary: content.vocabulary,
    phrases: content.phrases || [],
    grammar: content.grammar || [],
    pronunciationExamples: content.pronunciationExamples || [],
    pronunciationSentences: content.pronunciationSentences || [],
  }));
}

export function mergeKoreanContent(base, incoming) {
  const lessons = [...base.lessons];
  const vocabulary = [...base.vocabulary];
  const phrases = [...(base.phrases || [])];
  const grammar = [...(base.grammar || [])];
  const pronunciationExamples = [...(base.pronunciationExamples || [])];
  const pronunciationSentences = [...(base.pronunciationSentences || [])];
  const collisions = [];
  const add = (target, items, label) => {
    items.forEach((item) => {
      const existing = target.find((candidate) => candidate.id === item.id);
      if (!existing) target.push(clone(item));
      else if (!sameJson(existing, item)) collisions.push(`${label} ${item.id} conflicts with existing content.`);
    });
  };
  add(lessons, incoming.lessons || [], 'Lesson');
  incoming.vocabulary?.forEach((item) => {
    const existing = vocabulary.find((candidate) => candidate.id === item.id || candidate.ko === item.ko);
    if (!existing) vocabulary.push(clone(item));
    else if (existing.id === item.id && !sameJson(existing, item)) collisions.push(`Vocabulary ${item.id} conflicts with existing content.`);
    else {
      const [merged] = mergeVocabularyByLemma([existing], [item]);
      Object.assign(existing, merged);
    }
  });
  add(phrases, incoming.phrases || [], 'Phrase');
  add(grammar, incoming.grammar || [], 'Grammar');
  add(pronunciationExamples, incoming.pronunciationExamples || [], 'Pronunciation example');
  add(pronunciationSentences, incoming.pronunciationSentences || [], 'Pronunciation sentence');
  return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons, vocabulary, phrases, grammar, pronunciationExamples, pronunciationSentences, collisions };
}

export function getKoreanContent() {
  const seed = getSeedKoreanContent();
  const imported = loadImportedKoreanContent();
  return mergeKoreanContent(seed, imported);
}

export function exportKoreanContent(content = getKoreanContent()) {
  return JSON.stringify({ schemaVersion: KOREAN_SCHEMA_VERSION, language: 'ko-KR', lessons: content.lessons, vocabulary: content.vocabulary, phrases: content.phrases || [], grammar: content.grammar || [], pronunciationExamples: content.pronunciationExamples || [], pronunciationSentences: content.pronunciationSentences || [] }, null, 2);
}
