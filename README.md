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
