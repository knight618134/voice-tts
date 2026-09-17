# Article mode

Article mode is a local, browser-only reading workflow for longer English text.

## Built-in content

The app includes 12 samples covering:

- A1, A2, B1, and B2
- Nature, Culture, and Geography

Use the level and topic selectors, then choose `Use sample`. The text is split into sentences for progress, highlighting, pause/resume, repeat, and stop.

## Importing text

`Import .txt` reads a plain-text file in the browser. Paragraphs are kept as reading content and split into sentences. The filename becomes the article title. No file is uploaded.

## Quiz format

The optional Quiz JSON field accepts either an array or `{ "questions": [...] }`:

```json
[
  {
    "question": "What is the main idea?",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "explanation": "A short explanation."
  }
]
```

`answer` is a zero-based option index. The reader displays the quiz below the article. A selected answer is checked immediately; `Show answers` reveals the correct option without requiring a server.

## Optional n8n workflow

n8n is not required. It is useful when article generation should be driven by an AI workflow, a CMS, or a scheduled content source. The browser sends:

```json
{
  "action": "generate-article",
  "language": "en",
  "level": "b1",
  "topic": "geography",
  "quizCount": 3
}
```

The webhook should return JSON shaped like:

```json
{
  "title": "A generated title",
  "body": "The article text...",
  "quiz": [
    { "question": "...", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "..." }
  ]
}
```

The client also accepts common n8n wrappers such as an array containing one item, `{ "article": {...} }`, `{ "data": {...} }`, or `{ "output": "{...}" }`.

Because this is a static GitHub/Vercel site, the webhook must allow browser CORS for the deployed site. Keep provider API keys inside n8n, never in the page.
