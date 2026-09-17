# TTS architecture

## Layers

`TtsManager` 是播放流程唯一依賴的介面。閱讀器不直接呼叫 `speechSynthesis` 或 Kokoro。

- `NativeTtsEngine`：包裝 `SpeechSynthesisUtterance`，負責系統 voice、pause、resume、stop。
- `KokoroTtsEngine`：dynamic import `kokoro-js`，用 `KokoroTTS.from_pretrained()` lazy load WASM + q8 model，將生成音訊轉成 object URL 後交給 `HTMLAudioElement`。
- `TtsManager`：切換 engine、統一錯誤處理；Kokoro 失敗時初始化 Native engine 並重試目前句子。

## 播放佇列

`src/main.js` 保留目前 item index，使用 `playToken` 使舊的非同步播放迴圈失效：

1. 點擊 Play，建立一個播放 token。
2. 讀取目前 item，依 speaker 選 voice，呼叫 `TtsManager.speak()`。
3. 同一 item 依 repeat 設定重播。
4. 完成後等待 delay，更新 current index、highlight 與 progress。
5. 最後一項結束後顯示 Session complete。

pause/resume 只交給目前 engine；stop 會取消 token、停止 audio 或 SpeechSynthesis。沒有自動播放。

## Audio cache

Kokoro cache key 是 `[text, voice, speed]` 的序列化字串，最多保留 12 筆。每筆包含 Blob 與 object URL；LRU 淘汰和 `clearCache()` 都會呼叫 `URL.revokeObjectURL()`。播放 stop 不會刪掉仍可能重用的 cache URL；這避免 stop 後重播又重新生成音訊。

## iPhone Safari

Safari 要求音訊從使用者手勢開始。介面不會在頁面初始化時載入 Kokoro，也不會自動播放。Kokoro 的模型初始化與音訊播放都由 Play 流程開始；如果裝置在非同步模型載入後拒絕 `audio.play()`，`TtsManager` 會切回 Browser Voice。

WASM + q8 是本專案的預設，因為 iPhone 相容性優先且不依賴 WebGPU。WebGPU 沒有被當作必要條件。

## 新增其他 TTS engine

1. 建立一個具有 `init()`、`speak()`、`pause()`、`resume()`、`stop()`、`isReady()`、`getVoices()` 的 class。
2. 讓 `speak()` 以 Promise 在播放結束時 resolve，錯誤時 reject。
3. 在 `TtsManager.engines` 註冊實例。
4. 將 UI selector 的 engine value 與 fallback 行為接上。
5. 寫入 loading、playing、paused、stopped、error 狀態，並驗證舊的 word/dialog queue 不需要知道實作細節。
