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
- [ ] 選 Kokoro 後第一次 Play 顯示 Loading model 與進度
- [ ] 生成時顯示 Generating audio
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
