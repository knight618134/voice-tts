# TTS architecture

## Layers

`TtsManager` 是閱讀器唯一依賴的 TTS 介面。`src/main.js` 不直接呼叫 `speechSynthesis`、Piper runtime 或播放器。

- `NativeTtsEngine`：包裝 `SpeechSynthesisUtterance`，負責 Browser Voice、pause、resume、stop。
- `PiperTtsEngine`：dynamic import `@diffusionstudio/vits-web`，lazy load Piper/VITS WASM model，優先用 Web Audio 播放 WAV。
- `TtsManager`：切換 engine、統一 status 與錯誤，不會未經使用者同意自動 fallback。

預設 engine 是 Piper，預設內容模式是 Article。Piper 尚未啟用時 Play 會 disabled；播放器與設定區都有明確的 `Enable Piper Audio`。

## AudioContext 解鎖

1. 使用者點擊 `Enable Piper Audio`。
2. `PiperTtsEngine.enableAudio()` 建立並保存共用 `AudioContext`。
3. 在 click handler 的使用者手勢期間 `await context.resume()`。
4. 建立並啟動單 sample 靜音 `AudioBufferSourceNode`，確認 context state 是 `running`。
5. 只有成功後才標記 `audioUnlocked`；Play 才允許開始模型下載和推論。

模型載入與推論一定是後續非同步工作，因此不能假設 Play click 的 autoplay activation 會一直存在。先解鎖 AudioContext，可以把 iOS 的音訊權限問題與模型下載錯誤分開。

## Piper loading and Web Audio playback

1. Play 呼叫 `TtsManager.speak()`。
2. Piper runtime 以 dynamic import 載入。
3. `predict({ text, voiceId }, progress)` 從 Hugging Face 取得模型，並將模型儲存在 OPFS。
4. 產生 WAV Blob，讀取 `arrayBuffer()`，用共用 context `decodeAudioData()`。
5. 建立 `AudioBufferSourceNode`，連到 destination，播放結束時 resolve `speak()` Promise。
6. Web Audio 解碼失敗時，使用帶有 `playsinline` 與 `webkit-playsinline` 的 HTMLAudioElement 作第二層 fallback。

Article continuous mode 仍以句子作為推論單位，避免長文字超過模型限制，但會在播放前將 PCM16 WAV data 合併成單一 Blob。因此播放期間不會每句再等待一次模型推論。

## Pause / Resume / Stop

- Web Audio pause 會依 `AudioContext.currentTime` 計算 offset，停止一次性 source。
- Resume 會再次確認 AudioContext running，再從 offset 建立新的 source。
- HTMLAudioElement 使用原生 `pause()` 和 `play()`，並捕捉 rejected Promise。
- Stop 會取消播放 token、停止 source、將 HTML audio 歸零，但保留共用 AudioContext 與 cache。
- 播放中（包括 paused）鎖定 speech settings；Stop 或自然完成才解除鎖定。

## Cache and memory

cache key 是 `[text, voice, speed]` 的序列化字串，最多保留 8 筆。每筆包含 WAV Blob、object URL 和可選的 decoded `AudioBuffer`。LRU 淘汰與 `clearCache()` 都會呼叫 `URL.revokeObjectURL()`，避免 object URL 無限增加。播放 stop 不會刪除可重用的 cache entry。

模型本身由 `vits-web` 儲存到 OPFS；這和短期音訊 cache 是兩個不同生命週期。私密瀏覽或使用者清除網站資料可能使模型重新下載。

## iOS autoplay and errors

iOS Safari 與 iOS Edge 需要使用者手勢啟用音訊。`NotAllowedError`／`PIPER_AUDIO_NOT_ENABLED` 會顯示 `Playback blocked by iOS`，不會被誤判為模型下載錯誤。模型、WASM、推論、decode 或 audio error 則顯示 Piper error dialog。

錯誤後維持 Piper，不會偷偷改用 Native。使用者可按 `Keep Piper and retry`，或明確按 `Switch to Browser Voice`。這樣能讓使用者知道聲音來源，也避免 Browser Voice 悄悄取代本地語音。

## NativeTtsEngine

Native engine 使用裝置的 `speechSynthesis`，voice A/B selector 只在 Browser Voice 模式顯示。它不需要 AudioContext 或模型下載，適合 Piper 在某個裝置無法運行時由使用者手動選擇。

## 新增其他 engine

實作 `init()`、`speak()`、`pause()`、`resume()`、`stop()`、`isReady()`、`getVoices()`，並讓 `speak()` 在音訊真正結束時 resolve。接著在 `TtsManager.engines` 註冊實例、在 UI 加入選項，並保留清楚的 loading、playing、paused、stopped、blocked、error 狀態。

## n8n 邊界

n8n 適合生成文章 JSON，不適合被當作前端 TTS runtime。建議由 Vercel 前端 POST 到 n8n production Webhook，n8n 驗證 `level/topic`、呼叫 LLM、用 Structured Output 或 Code node 驗證 JSON，再透過 Respond to Webhook 回傳。n8n 的 API key 放在 credentials；前端只知道 webhook URL。

若未來需要所有裝置都使用同一個聲音，可另部署 Kokoro-FastAPI/Piper API，讓 n8n 或前端呼叫伺服器端 TTS；這是另一個部署元件，不應把模型伺服器硬塞進目前 Vercel 靜態前端。
