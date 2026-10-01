# Korean database plan

The current app is intentionally local-first: the content bundle is shipped with the frontend and study progress stays in browser `localStorage`. This keeps Korean practice working offline and avoids requiring an account.

## When a database is better

Use a hosted database when the same learner needs progress on phone, tablet, and computer, or when lessons need to be edited centrally. Supabase/Postgres is the simplest fit for this Vite/Vercel app because it provides Postgres, authentication, row-level security, and a browser client without adding a separate server for basic sync.

## Suggested tables

- `korean_lessons`: stable lesson id, title, full text, level, source metadata
- `korean_sentences`: stable sentence id, lesson id, order, Korean text, translation
- `korean_vocabulary`: stable vocabulary id, lemma, meaning, POS, topics, learning state
- `korean_vocabulary_forms`: vocabulary id, surface form, form note
- `korean_phrases`, `korean_grammar`, `korean_pronunciation_examples`
- `user_korean_progress`: user id, content id, content type, review state, play count, last played
- `user_korean_quiz_attempts`: user id, lesson id, quiz type, score, answers, submitted time

## Migration approach

1. Keep the checked-in JSON bundle as the seed and offline fallback.
2. Add optional sign-in and sync; anonymous users continue using localStorage.
3. On first sign-in, upload local progress using stable content ids and merge by latest timestamp.
4. Enable Row Level Security so each user can read/write only their own progress.

No database credentials or external project are committed to this repository. A real sync implementation should only be added after choosing the provider and supplying its project configuration.
