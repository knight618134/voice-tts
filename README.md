# Vocabulary Reader

一個 mobile-first、vanilla JavaScript 的單頁閱讀練習工具。它保留瀏覽器原生語音作為快速且相容性高的選項，也提供按需載入的 Kokoro.js 本地語音。

## 功能

- Word mode：單字、發音、中文意思與例句
- Dialog mode：A/B 對話播放
- Article mode：A1、A2、B1、B2 × Nature、Culture、Geography 文章
- Article mode 可匯入 `.txt`、附加選擇題與顯示答案
- 可選擇透過 n8n webhook 產生文章與題目；不接 n8n 也能使用內建文章
- Play / pause / resume / stop、上一項、下一項
- 每項重複次數、語速與項目間延遲
- 閱讀進度與目前項目 highlight
- Weak word 清單與 weak practice
- Browser Voice：沿用裝置的 SpeechSynthesis 語音
- Kokoro Local Voice：Kokoro.js + WASM + q8，模型只在第一次播放時載入
- Kokoro 失敗時自動切回 Browser Voice
- 所有資料只保存在瀏覽器的 localStorage，不需要後端

## 本機執行

```bash
npm install
npm run dev
```

打開 Vite 顯示的網址。生產建置與預覽：

```bash
npm run build
npm run preview
```

`npm run check` 會執行基本 JavaScript 語法檢查；`npm run lint` 會執行 ESLint。

## 輸入格式

Word mode 每行一個項目：

```text
curious | /ˈkjʊəriəs/ | 好奇的 | She was curious about the map.
```

Dialog mode 每行一個回合：

```text
A: Are you ready?
B: Yes, let's begin.
```

Article mode 直接貼上英文段落即可，程式會依句子切分並逐句朗讀。選擇 `Use sample` 可以載入不同程度與主題的內建文章；`Import .txt` 可載入自己的純文字文章。

選擇題可以放在 Article mode 的 Quiz JSON 欄位，例如：

```json
[
  {
    "question": "What is the main idea?",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "explanation": "The first paragraph explains the main idea."
  }
]
```

## n8n 是可選的

不需要 n8n 才能使用文章功能。建議先用內建文章或 `.txt` 匯入；如果希望用自己的 AI workflow 依程度與主題產生文章，再填入 n8n webhook URL。前端會 POST：

```json
{
  "action": "generate-article",
  "language": "en",
  "level": "b1",
  "topic": "geography",
  "quizCount": 3
}
```

n8n webhook 應回傳下列格式，`quiz` 可省略：

```json
{
  "title": "A generated title",
  "body": "The first paragraph...",
  "quiz": [
    { "question": "...", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "..." }
  ]
}
```

瀏覽器直接呼叫 n8n 時，webhook 需要允許本站 origin 的 CORS；不要把 OpenAI 或其他服務的私密 API key 放在網頁欄位。n8n 只負責產生內容，朗讀仍在瀏覽器端完成。

## 兩種 TTS 引擎

### Browser Voice

使用瀏覽器的 `SpeechSynthesisUtterance`。它幾乎不需要下載、啟動快，並可使用系統提供的 voice selector。實際聲音會依作業系統與瀏覽器而異。

### Kokoro Local Voice

使用 `kokoro-js` 的官方 API：

- model：`onnx-community/Kokoro-82M-v1.0-ONNX`
- dtype：`q8`
- device：`wasm`
- voice：`af_heart`、`af_bella`、`am_fenrir`、`bf_emma`、`bm_george`

Kokoro 模組是 dynamic import，使用者沒有選擇 Kokoro 時不會載入。選擇後也會等到按下 Play 才下載模型；第一次會顯示 Loading model 與進度，之後生成的短音訊會進入有上限的 cache。cache 淘汰時會 revoke object URL，避免手機記憶體持續增加。

## iPhone Safari 使用方式

1. 先選擇 Browser Voice，直接按 Play 即可快速開始。
2. 若選擇 Kokoro，保持網路連線，第一次播放等待模型下載完成。
3. Safari 的音訊必須由使用者手勢啟動，因此請直接點擊 Play；不要期待頁面載入後自動播放。
4. 如果 WASM、模型下載或音訊播放失敗，應用程式會自動改用 Browser Voice，且不會讓閱讀頁面停止。

## Vercel 部署

在 Vercel Dashboard 選擇 **Add New → Project → Import Git Repository**，匯入 `knight618134/voice-tts`。Vercel 會自動辨識 Vite；若需要手動設定，請使用：

- Install command：`npm ci`
- Build command：`npm run build`
- Output directory：`dist`

推送到 `main` 後，Vercel 會自動建立新的 deployment。這個專案不需要後端、環境變數或 API key。Kokoro 模型仍會在使用者第一次選擇並播放時，從模型來源於瀏覽器端下載。

## 常見問題

**為什麼第一次 Kokoro 播放比較久？** 模型與 WASM runtime 需要首次下載並初始化，後續瀏覽器通常可使用快取。

**為什麼看不到系統 voice？** 某些瀏覽器要等 `voiceschanged` 事件後才提供清單；本頁會自動重新整理。沒有清單時仍會使用系統預設 voice。

**Kokoro 會上傳我的文字嗎？** 這個前端流程把文字交給瀏覽器本地的 Kokoro runtime 生成音訊，沒有本專案後端；模型檔案本身第一次會從 Hugging Face 模型來源下載。

**可以離線使用 Kokoro 嗎？** 只有模型和 runtime 已被瀏覽器快取，且快取仍可用時才可能離線使用；首次載入需要網路。Browser Voice 不需要模型下載。

## 授權與來源

Kokoro.js 與 `onnx-community/Kokoro-82M-v1.0-ONNX` 的授權、voice 說明與模型條款，請以各自官方 repository / model card 為準。Vocabulary Reader 本身的程式碼未附加第三方模型檔案。
