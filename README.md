# Vocabulary Reader

一個 mobile-first、vanilla JavaScript 的閱讀練習工具。預設使用 Piper/VITS Web 在瀏覽器本地產生語音；Browser Voice 仍保留為使用者明確選擇的備用方案。

## 功能

- Article mode：A1、A2、B1、B2 × Nature、Culture、Geography 文章
- 可匯入 `.txt`、加入選擇題並顯示答案
- 全文連續朗讀或逐句 highlight
- Word mode、Dialog mode、A/B speaker、repeat、pause、resume、stop、rate、delay
- 閱讀進度、目前項目 highlight、weak word 與 weak practice
- Piper Local Voice：VITS/Piper ONNX 模型在瀏覽器 WASM 執行
- Browser Voice：裝置的 `SpeechSynthesis`，只在使用者選擇後使用
- Piper voice/model lazy load、音訊 cache、錯誤視窗與 iOS 音訊啟用流程
- 不需要本專案後端；閱讀資料留在瀏覽器 localStorage
- Korean mode：KR-R01、KR-R02 閱讀、繁中翻譯揭示、段落／全文朗讀、可點擊單字查詢
- Korean notebook：30 筆去重單字、例句、來源／課次、複習狀態、搜尋、匯出 JSON／TSV
- Korean study sections：依課次分開的單字複習、單字測驗、句子練習、連續文章閱讀；單字可分開播放單字／例句，並依 Repeat 設定連續播放
- Korean full content pack：內建 `src/data/korean-content-full.json` 與 `src/data/korean-vocabulary-full.json`，提供 191 筆教材單字、25 片語、9 文法項目、5 篇閱讀、117 個發音例子與 5 個發音長句
- Korean quiz：19 題，按下 Submit answers 後才計分；第一次與重做結果分開保存
- Korean import：可預覽並匯入未來的 `KR-R03` 等 JSON；相同 ID 與相同內容不重複，衝突會拒絕

## 本機執行

```bash
npm install
npm run dev
```

生產建置與預覽：

```bash
npm run build
npm run preview
```

`npm run check` 會做基本語法檢查；`npm run lint` 會執行 ESLint。

## 輸入格式

Word mode 每行一個項目：

```text
curious | /ˈkjʊəriəs/ | 好奇的 | She was curious about the map.
```

Dialog mode：

```text
A: Are you ready?
B: Yes, let's begin.
```

Article mode 直接貼上英文段落。`Full article · continuous` 會先將句子分別生成，再合併為一個 WAV 播放，因此播放時不會在每句之間重新推論；`Sentence by sentence · highlight` 則保留逐句 highlight 與 delay。

## Korean mode

切換右上角的 `Language` 到 `한국어 · Korean` 後，可從內建課程選擇閱讀課次。原本的 `src/data/korean-lessons.json`／`korean-vocabulary.json` 仍保留，完整內容包則位於 [`src/data/korean-content-full.json`](src/data/korean-content-full.json) 和 [`src/data/korean-vocabulary-full.json`](src/data/korean-vocabulary-full.json)。啟動時會做資料正規化與 lemma 去重，保留舊版複習紀錄，同時加入 reading-03～05；使用穩定 `id`／source id，不依賴陣列位置。文章是生成的學習材料，`isTextbookVerbatim` 為 `false`，不包含教材 PDF 原文。

韓文播放固定使用瀏覽器 `SpeechSynthesis`，每次 utterance 設為 `lang = 'ko-KR'`；Piper/Kokoro 的英文設定不會被宣稱支援韓文。韓文模式中的 Browser Voice A/B 只列出瀏覽器已安裝的 `ko-*` voices。若裝置沒有載入韓文 voice，畫面會提示安裝 Korean 系統語音。iPhone Safari 請從明確的 `Listen` 或 `Play` 按鈕開始播放；程式會在 tap 事件內立即呼叫 SpeechSynthesis，避免等待 voice 載入而失去 user activation。

韓文單字複習頁依目前課次顯示 linked vocabulary，可獨立播放單字本身或例句，也可播放整課單字；右側 `Repeats per item` 控制每個單字／句子／段落的重複次數。播放中的同一個按鈕可切換 `Pause`／`Resume`，全域播放器也可 `Stop`。每個單字的播放次數與最後練習時間保存於 `vocabulary-reader:korean-word-progress:v1`。

`句子` 模式會將課文拆成逐句卡片；`文章` 模式則保留整篇文章的連續閱讀結構，並提供整篇／段落朗讀。韓文文字中的已知單字會顯示詞形、助詞或變化提示，可用 `Hide forms & particles` 暫時隱藏。`單字測驗` 會從目前課次抽取最多 10 題，第一次作答與重做成績分開保存於 `vocabulary-reader:korean-word-quiz:v1`。

參考區另外提供 `Phrases`、`Grammar / particles`、`Pronunciation examples`，且教材單字可依教材章節、詞性、主題與 `learning_state` 篩選。純音節練習不會被加入一般單字卡。

點擊文章中的底線單字會聚焦到 notebook。`Naver Dictionary` 只是另開參考頁，使用 URL 格式：`https://korean.dict.naver.com/koendict/#/search?query=<encodeURIComponent(lemma)>`。本專案不爬取 Naver、不重新散佈字典音檔，也不宣稱能自動同步 Naver 帳戶。

### 匯入未來課次

在 Korean content panel 點擊 `Import Korean JSON`，選取包含 `schemaVersion: 1` 且至少有 `lessons` 或 `vocabulary` 的檔案。每筆內容必須有穩定 `id`；lesson question 的 `correctIndex` 必須落在 options 範圍內，課次與單字引用會被檢查。匯入結果存於版本化 localStorage key `vocabulary-reader:korean-content:v1`，複製同一份 bundle 不會增加重複內容或清除複習／測驗進度。

完整內容包的 `schema_version: 1.0.0` 新格式也可直接透過 `Import Korean JSON` 匯入；程式會轉成目前 reader 所需的顯示格式，並將 phrases、grammar、pronunciation examples 分開保存。新增 reading-06、reading-07 時，只要沿用相同欄位與穩定 ID，不需要修改 UI code。

新增 KR-R03 時，沿用現有欄位與唯一 ID（例如 `KR-R03`、`KR-R03-Q01`、`KR-V031`），即可直接匯入，不需要修改 application code。使用 `Export JSON` 可取得目前內容 bundle；`Export TSV` 會輸出 notebook 欄位供試算表或 Anki 整理。

## Piper Local Voice

本專案使用 `@diffusionstudio/vits-web`。它透過 ONNX Runtime Web、WASM 與 Origin Private File System（OPFS）在瀏覽器執行 Piper/VITS 模型；模型不是在頁面開啟時下載，而是在第一次按 Play 後 lazy load。

目前提供：

- `en_US-lessac-medium`
- `en_US-hfc_female-medium`
- `en_US-hfc_male-medium`
- `en_GB-cori-medium`
- `en_GB-alan-medium`

第一次使用流程：

1. 保持 `Piper Local Voice`，點擊 `Enable Piper Audio`。
2. 等待顯示 `Piper audio enabled`；這一步只解鎖共用 `AudioContext`，不下載模型。
3. 點擊 Play，等待 `Downloading Piper voice` 和 `Generating Piper audio`。
4. 之後同一個文字、voice、speed 會優先使用本地音訊 cache；模型也通常會留在 OPFS，重新載入不必重新下載全部模型。

Piper 仍可能受瀏覽器儲存空間、私密瀏覽、記憶體和 iOS WebKit 限制影響，所以不能把「模型已下載」當成每一台 iPhone 都一定能播放。若模型、WASM、推論、解碼或播放失敗，畫面會顯示錯誤視窗；使用者可選擇重試，或明確切換到 Browser Voice，不會自動切換。

## iPhone Safari / iOS Edge 使用方式

iOS Edge 的媒體層仍受到 iOS WebKit autoplay 規則影響，因此第一次使用要在同一次使用者操作中點擊 `Enable Piper Audio`。播放時使用 Web Audio API；若解碼失敗，才嘗試設定 `playsinline` 的 HTMLAudioElement。

目前介面會在播放前鎖定 engine、voice、speed、delay 和 repeat；Pause/Resume 與 Stop 是不同按鈕。Stop 或自然播放完成後才可修改 speech settings。

本專案沒有實體 iPhone 測試環境，因此 README 不宣稱 iPhone Safari 或 iOS Edge 已通過實機驗證，請依 [`docs/MOBILE_TESTING.md`](docs/MOBILE_TESTING.md) 測試。

## Browser Voice

Browser Voice 使用 `SpeechSynthesisUtterance`，載入快且不需要模型下載，但聲音由作業系統／瀏覽器決定。只有使用者在設定中選擇 Browser Voice，或在 Piper 錯誤視窗中按下 `Switch to Browser Voice`，才會切換。

## n8n 文章生成：建議獨立成另一個服務

n8n 不需要放進這個前端 repository，也不是 Piper 的必要條件。建議架構是：

```text
Vercel Vocabulary Reader
        │ POST article request
        ▼
n8n Webhook workflow
        │ LLM + validation + JSON response
        ▼
title + body + quiz → 回到瀏覽器
```

前端只送：

```json
{
  "action": "generate-article",
  "language": "en",
  "level": "b1",
  "topic": "geography",
  "quizCount": 3
}
```

n8n 應回傳：

```json
{
  "title": "A generated title",
  "body": "The first paragraph...",
  "quiz": [
    { "question": "...", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "..." }
  ]
}
```

建議使用 n8n Cloud 或有公開 HTTPS 網址的 self-hosted n8n。Webhook 必須設定允許 Vercel 網域的 CORS；LLM API key 只放在 n8n credentials，不能放進前端。n8n 若只跑在自己電腦的 `localhost`，Vercel 與 iPhone 無法呼叫。

n8n 可另外串接伺服器端的 Kokoro-FastAPI 或 Piper API，但目前這個版本的語音是在瀏覽器本地產生，不需要讓 n8n 處理音訊。

## Vercel 部署

Vercel 設定：

- Install command：`npm ci`
- Build command：`npm run build`
- Output directory：`dist`

推送 `main` 後，Vercel 會自動建立 deployment。Piper 模型與音訊是在使用者裝置端 lazy load，Vercel 不會替使用者預先執行模型。

## 授權與來源

Piper 模型與 `@diffusionstudio/vits-web` 的授權、voice 條款請以各自官方 package、repository 與模型來源為準。專案不把第三方模型檔案提交到 Git。
