---
description: 跑 harness 自檢（doctor.mjs）並解讀結果
---

執行 harness 開機自檢：

1. 跑 `node docs/harness/scripts/doctor.mjs`，完整保留輸出。
2. 解讀結果並回報 User：
   - 全部 PASS → 一句話回報「自檢通過」＋ WARN 條數即可，不要長篇大論。
   - 有 FAIL → 逐條列出 FAIL 項與其含義，**先回報 User 再開工**（CLAUDE.md 開機程序）；不要自行「順手修」FROZEN 檔或設定來讓它變綠。
3. 若 doctor.mjs 本身跑不起來（node 錯誤、檔案不存在），這本身就是最高優先級的 FAIL——立即回報，這代表防線失效（A 診斷書痛點 1）。
