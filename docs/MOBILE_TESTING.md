# Mobile testing checklist

目前沒有連接實體 iPhone，因此以下是應在實機完成的測試清單；本專案的建置與語法檢查不等於已通過 iPhone Safari 實測。

## 尺寸與方向

- [ ] 375px portrait
- [ ] 390px portrait
- [ ] 393px portrait
- [ ] 430px portrait
- [ ] 768px tablet width
- [ ] Desktop width
- [ ] iPhone portrait / landscape
- [ ] 沒有水平捲軸
- [ ] safe-area bottom 不遮住按鈕

## First load and model

- [ ] 初次開啟不會自動播放或下載 Kokoro
- [ ] Browser Voice 可直接開始
- [ ] 選 Kokoro 後先看到 `Kokoro audio not enabled`
- [ ] 點擊 `Enable Kokoro Audio` 後顯示 `Kokoro audio enabled`
- [ ] Enable 流程完成後才按 Play，第一次播放顯示 Loading model 與進度
- [ ] 生成時顯示 Generating audio
- [ ] iOS 阻擋時顯示 `Playback blocked by iOS`，不誤顯示模型錯誤
- [ ] 第二次播放相同 text / voice / speed 會使用 cache
- [ ] 重新載入後頁面仍能正常開始

## Failure and fallback

- [ ] 暫時中斷網路後 Kokoro 失敗，頁面自動切回 Browser Voice
- [ ] Browser Voice 不可用時，錯誤訊息清楚且其他 UI 仍可操作
- [ ] console 沒有未處理的 Promise rejection
- [ ] cache 淘汰後沒有持續增加 object URL 或記憶體

## Playback flows

- [ ] Word mode：current item、highlight、progress 正確
- [ ] Dialog mode：A/B voice 對應正確
- [ ] repeat 1 / 2 / 3 次正確
- [ ] pause / resume 保持目前音訊位置
- [ ] stop 後可以再次 Play
- [ ] previous / next 在播放前後都可用
- [ ] delay 在 item 間生效
- [ ] rate 在 Browser Voice 與 Kokoro 都生效

## Low-memory device

- [ ] 長文字可分段輸入而不讓單次生成過長
- [ ] 連續播放後仍能 stop
- [ ] Safari 被系統回收後重新開頁仍可使用 Browser Voice

## iPhone Safari / iOS Edge 實機步驟

1. 使用無痕／InPrivate 視窗開啟公開 Vercel production domain，確認不是 Vercel 登入頁。
2. 先測 Browser Voice 的 Word mode，確認手機媒體音量與輸出裝置正常。
3. 切換 Kokoro，點擊 `Enable Kokoro Audio`，等待狀態變成 `Kokoro audio enabled`。
4. 按 Play，確認順序為 Loading model → Generating audio → Playing。
5. 測試 Word、Dialog、Article，各按一次 pause、resume、stop。
6. 鎖定／解鎖螢幕或切換分頁後，重新點擊 Enable，再測一次 Resume。
7. 若無聲音，記錄狀態文字與 notice 的實際錯誤；不要只記錄「沒有聲音」。

目前開發環境無法代替實體 iPhone 播放器驗證，因此上述 Safari／iOS Edge 項目仍需在實機完成，不能以 desktop Chrome 結果宣稱通過。
