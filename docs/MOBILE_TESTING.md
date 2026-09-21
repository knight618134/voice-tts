# Mobile testing checklist

目前無法代替實體 iPhone 執行音訊測試，因此下列項目完成前，不宣稱 iPhone Safari 或 iOS Edge 通過。

## 尺寸與方向

- [ ] 375px、390px、393px、430px portrait
- [ ] 768px tablet 與 desktop
- [ ] iPhone portrait / landscape
- [ ] 沒有水平捲軸
- [ ] safe-area bottom 不遮住控制按鈕
- [ ] Play、Pause、Stop 和 select/input 約 44px 以上且容易點擊

## 初次載入與 Piper

- [ ] 頁面開啟不會自動播放或下載模型
- [ ] 初始模式是 Article，初始 TTS 是 Piper
- [ ] Piper 未啟用時 Play disabled，播放器內可看到 Enable Piper Audio
- [ ] 點擊 Enable 後顯示 `Piper audio enabled`
- [ ] 點擊 Play 後依序看到 downloading / generating / playing
- [ ] 第二次相同 text / voice / speed 使用 cache
- [ ] 重新載入後模型若仍在 OPFS，不必重新下載完整模型

## 失敗與 fallback

- [ ] 暫時中斷網路，Piper 保持選取並顯示錯誤視窗
- [ ] Retry Piper 不會切換 engine
- [ ] 只有按 Switch to Browser Voice 才切換
- [ ] iOS 音訊未解鎖顯示 `Playback blocked by iOS`
- [ ] console 沒有未處理的 Promise rejection
- [ ] cache 淘汰後 object URL 被 revoke

## 播放流程

- [ ] Article continuous 先集中生成，再連續播放
- [ ] Sentence mode 逐句 highlight 與 delay 正常
- [ ] Word / Dialog mode 正常
- [ ] A/B Browser Voice 選擇正確
- [ ] repeat 1 / 2 / 3 次正確
- [ ] Pause、Resume、Stop 是三個獨立控制
- [ ] 播放期間設定鎖定；Stop 或自然完成後重新開放
- [ ] stop 後可以重新 Play
- [ ] previous / next、progress、highlight 正確

## iPhone Safari / iOS Edge 實機步驟

1. 用公開 HTTPS Vercel 網址開啟 Safari 與 Edge，確認不是 Vercel login protection 頁面。
2. 確認是 Article + Piper，且 Play disabled。
3. 直接點擊 `Enable Piper Audio`，等待狀態完成。
4. 點擊 Play，確認看到 downloading → generating → playing 和實際聲音。
5. 測試 Word、Dialog、Article，以及 Pause / Resume / Stop。
6. 鎖定螢幕、切換分頁、返回頁面後，重新 Enable 再測。
7. 關閉網路測試錯誤視窗，再分別測 Retry Piper 與 Switch to Browser Voice。
8. 記錄 iPhone 型號、iOS 版本、瀏覽器版本、狀態文字與 console/remote Web Inspector 錯誤。

若 Piper 在某一 iPhone 仍不穩定，Browser Voice 是明確的手動 fallback；若產品要求所有 iPhone 都一致，下一步應評估伺服器端 Piper/Kokoro API，而不是繼續增加前端 autoplay workaround。
