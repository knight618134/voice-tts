import bundledLessons from './korean-lessons.json';
import bundledVocabulary from './korean-vocabulary.json';

export const KOREAN_SCHEMA_VERSION = 1;
export const KOREAN_CONTENT_STORAGE_KEY = 'vocabulary-reader:korean-content:v1';

const clone = (value) => JSON.parse(JSON.stringify(value));

export function getSeedKoreanContent() {
  return {
    schemaVersion: KOREAN_SCHEMA_VERSION,
    language: 'ko-KR',
    lessons: clone(bundledLessons.lessons),
    vocabulary: clone(bundledVocabulary.vocabulary),
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
  if (input.schemaVersion !== KOREAN_SCHEMA_VERSION) errors.push(`schemaVersion must be ${KOREAN_SCHEMA_VERSION}.`);
  const lessons = Array.isArray(input.lessons) ? input.lessons : [];
  const vocabulary = Array.isArray(input.vocabulary) ? input.vocabulary : Array.isArray(input.entries) ? input.entries : [];
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
    summary: { lessons: lessons.length, vocabulary: vocabulary.length, questions: lessons.reduce((sum, lesson) => sum + (lesson.questions?.length || 0), 0) },
  };
}

export function loadImportedKoreanContent() {
  try {
    const stored = JSON.parse(localStorage.getItem(KOREAN_CONTENT_STORAGE_KEY) || '{"schemaVersion":1,"lessons":[],"vocabulary":[]}');
    const result = validateKoreanBundle(stored, { allowPartial: true });
    return result.ok ? { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: result.lessons, vocabulary: result.vocabulary } : { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [] };
  } catch {
    return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons: [], vocabulary: [] };
  }
}

export function saveImportedKoreanContent(content) {
  localStorage.setItem(KOREAN_CONTENT_STORAGE_KEY, JSON.stringify({
    schemaVersion: KOREAN_SCHEMA_VERSION,
    lessons: content.lessons,
    vocabulary: content.vocabulary,
  }));
}

export function mergeKoreanContent(base, incoming) {
  const lessons = [...base.lessons];
  const vocabulary = [...base.vocabulary];
  const collisions = [];
  const add = (target, items, label) => {
    items.forEach((item) => {
      const existing = target.find((candidate) => candidate.id === item.id);
      if (!existing) target.push(clone(item));
      else if (!sameJson(existing, item)) collisions.push(`${label} ${item.id} conflicts with existing content.`);
    });
  };
  add(lessons, incoming.lessons || [], 'Lesson');
  add(vocabulary, incoming.vocabulary || [], 'Vocabulary');
  return { schemaVersion: KOREAN_SCHEMA_VERSION, lessons, vocabulary, collisions };
}

export function getKoreanContent() {
  const seed = getSeedKoreanContent();
  const imported = loadImportedKoreanContent();
  return mergeKoreanContent(seed, imported);
}

export function exportKoreanContent(content = getKoreanContent()) {
  return JSON.stringify({ schemaVersion: KOREAN_SCHEMA_VERSION, language: 'ko-KR', lessons: content.lessons, vocabulary: content.vocabulary }, null, 2);
}
