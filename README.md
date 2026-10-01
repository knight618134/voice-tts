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
- Korean curriculum：將 193 個去重單字重新編為 14 個 A1–A2 主題課程，涵蓋單字、例句、句子與文章練習
- Korean vocabulary：主畫面可依課程、主題、詞性分類；固定高度清單支援滑鼠滾輪，並可分開播放單字與例句
- Korean quiz：開始前選擇例句選義、例句填空或聽力辨識，再進入 10／20 題逐題作答流程
- Korean audio：固定頂部播放器提供上一個、Play／Pause／Resume、下一個與 Stop；韓文裝置有 Yuna 時預設使用 Yuna
- Korean full content pack：內建 193 個合併後單字、25 片語、9 文法項目、117 個發音例子與 5 個發音長句

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

切換右上角的 `Language` 到 `한국어 · Korean` 後，可從 14 個 A1–A2 主題課程選擇內容。完整內容包位於 [`src/data/korean-content-full.json`](src/data/korean-content-full.json) 和 [`src/data/korean-vocabulary-full.json`](src/data/korean-vocabulary-full.json)；啟動時會正規化、依 lemma 去重為 193 個單字，再按照人物、時間、地點、交通、飲食、購物、學習、功能詞、行動、描述、自然與收音等主題編課。每個單字只歸入一個主課程，因此 14 課合計正好涵蓋 193 詞。

韓文播放固定使用瀏覽器 `SpeechSynthesis`，每次 utterance 設為 `lang = 'ko-KR'`；Piper/Kokoro 的英文設定不會被宣稱支援韓文。韓文模式中的 Browser Voice A/B 只列出瀏覽器已安裝的 `ko-*` voices，並優先選擇 `Yuna`。若裝置沒有 Yuna，才使用該裝置第一個可用的韓文語音；若完全沒有韓文 voice，畫面會提示安裝 Korean 系統語音。iPhone Safari 請從明確的 `Listen` 或 `Play` 按鈕開始播放。

韓文單字複習頁可依課程、主題與詞性篩選，單字清單限制在固定高度內並獨立滾動。每張卡可播放單字本身或完整例句，也可連續播放目前分類；`Repeats per item` 控制重複次數。固定於內容頂部的播放器以中央按鈕切換 `Play`／`Pause`／`Resume`，並保留上一個、下一個與 `Stop`。每個單字的播放次數與最後練習時間保存於 `vocabulary-reader:korean-word-progress:v1`。

`句子` 模式使用每課單字的完整例句；`文章` 模式把同一主題的例句編排成多段連續閱讀，並提供整篇／段落朗讀。舊的 `KOREAN COMPREHENSION` 區域已移除。`單字測驗` 會先顯示模式選擇頁，使用者可選例句選義、例句填空或聽力辨識，再作答 10 或 20 題；每題立即顯示正確答案與完整例句，成績保存於 `vocabulary-reader:korean-word-quiz:v1`。

參考區另外提供 `Phrases`、`Grammar / particles`、`Pronunciation examples`，且教材單字可依教材章節、詞性、主題與 `learning_state` 篩選。純音節練習不會被加入一般單字卡。

點擊文章中的底線單字會聚焦到 notebook。`Naver Dictionary` 只是另開參考頁，使用 URL 格式：`https://korean.dict.naver.com/koendict/#/search?query=<encodeURIComponent(lemma)>`。本專案不爬取 Naver、不重新散佈字典音檔，也不宣稱能自動同步 Naver 帳戶。

### 更新內容包

完整內容包直接隨網站載入，不需要使用者手動 Load／Import／Export。程式會在啟動時正規化新格式，並將 phrases、grammar、pronunciation examples 分開保存。新增單字時需沿用穩定 ID；課程分組會在啟動時依主題重新建立。

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

目前介面會在播放前鎖定 engine、voice、speed、delay 和 repeat；中央播放鍵會在 Play／Pause／Resume 之間切換，Stop 保持獨立。停止或自然播放完成後才可修改 speech settings。

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
