# TTS architecture

## Layers

`TtsManager` 是播放流程唯一依賴的介面。閱讀器不直接呼叫 `speechSynthesis`、`AudioContext` 或 Kokoro。

- `NativeTtsEngine`：包裝 `SpeechSynthesisUtterance`，負責系統 voice、pause、resume、stop。
- `KokoroTtsEngine`：dynamic import `kokoro-js`，用 `KokoroTTS.from_pretrained()` lazy load WASM + q8 model；啟用後優先使用共用 `AudioContext` 解碼與播放，HTMLAudioElement 是第二層播放 fallback。
- `TtsManager`：切換 engine、管理 AudioContext 啟用並統一錯誤狀態。它不會自行從 Kokoro 切換至 Native；引擎切換只能來自使用者操作。

初始引擎是 Kokoro，初始內容模式是 Article。Kokoro 尚未啟用時 Play 維持 disabled，播放器和 Speech settings 都提供明確的 Enable 按鈕。

## AudioContext 解鎖流程

Kokoro 有獨立的 `Enable Kokoro Audio` 按鈕，避免把音訊啟用藏在模型下載流程中：

1. 使用者點擊 Enable。
2. `KokoroTtsEngine.enableAudio()` 建立並保存一個共用 `AudioContext`。
3. 在同一個 click handler 觸發 `context.resume()`，並等待其 Promise 完成。
4. 建立一個單 sample 的靜音 `AudioBufferSourceNode`，連到 context destination 後 start。
5. 只有 context state 是 `running` 才標記 `audioUnlocked = true`。
6. Play 才會開始 dynamic import、模型下載與 `tts.generate()`。

如果 iOS 沒有允許啟用，狀態會顯示 `Playback blocked by iOS`，不會把這個情況誤判成模型載入失敗，也不會偷偷依賴一個未等待的 `HTMLAudioElement.play()`。

## Web Audio 播放流程

1. 取得或建立 `[text, voice, speed]` cache entry。
2. 將 WAV Blob 轉為 `arrayBuffer()`。
3. 呼叫共用 context 的 `decodeAudioData()`，並把 decoded `AudioBuffer` 暫存在同一筆 cache entry。
4. 建立 `AudioBufferSourceNode`、連到 context destination，從目前 offset `start()`。
5. 播放結束時由 `onended` resolve `speak()` Promise，播放佇列才移到下一項。

`RawAudio` 不直接使用 `toBlob()`，因為該方法可能產生 Safari 解碼不穩定的 32-bit float WAV。引擎會先將 waveform 正規化成 PCM16 WAV，再交給 Web Audio。若 Web Audio 解碼或 source 建立失敗，會再嘗試共用的 HTMLAudioElement。該元素會設定 `playsinline`、`webkit-playsinline`，並捕捉 `audio.play()` rejection 與 `audio.onerror`；兩層都失敗後，播放 Promise 會 reject 並由 UI 顯示選擇視窗。

## 播放佇列

`src/main.js` 保留目前 item index，使用 `playToken` 使舊的非同步播放迴圈失效：

1. 點擊 Play，建立一個播放 token。
2. 讀取目前 item，依 speaker 選 voice，呼叫 `TtsManager.speak()`。
3. 同一 item 依 repeat 設定重播。
4. 完成後等待 delay，更新 current index、highlight 與 progress。
5. 最後一項結束後顯示 Session complete。

Play、Pause/Resume、Stop 是分開的按鈕。pause/resume 只交給目前 engine；Web Audio pause 會記錄 `AudioContext.currentTime` 對應的 offset，並停止目前的一次性 source，resume 時建立新的 source 從 offset 繼續。HTMLAudioElement 則使用原生 `pause()`／`play()`。stop 會取消 token、停止 source、audio 或 SpeechSynthesis，但不關閉共用 AudioContext。播放期間（包含 paused）speech settings 會鎖定，Stop 或自然結束後才解鎖。

## Kokoro 錯誤與引擎選擇

模型下載、推論、WAV decode 或兩層播放器都失敗時，`TtsManager.speak()` 原樣拋出錯誤，不會改寫 `currentEngine`，也不會暗中朗讀 Native voice。UI 會停止目前 session 並顯示 modal：

- `Keep Kokoro and retry`：保持目前 item、voice 與 speed，重新執行 Kokoro。
- `Switch to Browser Voice`：只有在這次使用者點擊後才切換，並從目前 item 繼續。

`NotAllowedError` 仍獨立顯示為 iOS playback blocked；modal 的 Kokoro 選項會先重新執行音訊啟用，再重試。

## Audio cache

Kokoro cache key 是 `[text, voice, speed]` 的序列化字串，最多保留 12 筆。每筆包含 Blob、object URL 和可選的 decoded AudioBuffer；LRU 淘汰和 `clearCache()` 都會呼叫 `URL.revokeObjectURL()` 並移除 decoded entry。播放 stop 不會刪掉仍可能重用的 cache URL；這避免 stop 後重播又重新生成音訊。

## iPhone Safari

Safari 要求音訊從使用者手勢開始。iOS Edge 在一般情況下也使用 iOS 的 WebKit 媒體行為，因此同樣適用。介面不會在頁面初始化時載入 Kokoro，也不會自動播放。必須先點擊 Enable，等待共用 `AudioContext.resume()` 完成，再按 Play 等待模型下載與音訊生成。如果 context 被系統暫停，Resume 會再次嘗試恢復；如果仍被拒絕，顯示 `Playback blocked by iOS`，不把它與模型錯誤混在一起。

WASM + q8 是本專案的預設，因為 iPhone 相容性優先且不依賴 WebGPU。WebGPU 沒有被當作必要條件。

## 新增其他 TTS engine

1. 建立一個具有 `init()`、`speak()`、`pause()`、`resume()`、`stop()`、`isReady()`、`getVoices()` 的 class。
2. 讓 `speak()` 以 Promise 在播放結束時 resolve，錯誤時 reject。
3. 在 `TtsManager.engines` 註冊實例。
4. 將 UI selector 的 engine value 與明確的錯誤選擇流程接上，禁止未經使用者同意的自動 fallback。
5. 寫入 loading、playing、paused、stopped、error 狀態，並驗證舊的 word/dialog queue 不需要知道實作細節。
