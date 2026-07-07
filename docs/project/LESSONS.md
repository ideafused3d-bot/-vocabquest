# LESSONS — 踩坑紀錄

> FREE：任何 session 踩坑後依 F-KNOWLEDGE-PROTOCOL §2 的格式追加。編號遞增不重用。超過 30 條或 300 行 → 觸發 F §4 精簡流程。

## L-001 靜態檔案必須整組部署（2026-07-06 前，遷移自舊 CLAUDE.md 技術債 #10）

- 症狀：使用者點登入後 UI 卡在「處理中」不恢復，Console 出現 `ReferenceError: sb is not defined`。
- 根因：三個頁面的 `<script src>` 有嚴格依賴順序（Supabase SDK → config.js → common.js → 頁面 js），任一檔沒同步部署（漏傳、被舊版覆蓋、主機大小寫敏感路徑對不上）就會讓 `sb` 未定義。
- 解法：已加防呆——三頁在 `common.js` 之後插 inline script，偵測 `typeof sb === 'undefined'` 時整版顯示「網站資源載入失敗，請重新整理／檢查部署」。
- 防再犯：改動 `vocab-app/public/` 任何檔案後**整個資料夾一起重新部署**；懷疑快取先 Ctrl+Shift+R 或無痕視窗。已列 CLAUDE.md 紅線 2。

## L-002 帳號建立順序陷阱（2026-07-04 前，遷移自舊 CLAUDE.md 技術債 #9）

- 症狀：登入後被立刻登出彈回登入頁（登入頁現在會顯示明確錯誤訊息）。
- 根因：在 `schema.sql` 執行**之前**註冊的帳號，沒有 `handle_new_user` trigger 建的 `profiles` 列。
- 解法：Supabase SQL Editor 執行 `vocab-app/supabase/repair-profiles.sql` 補建。
- 防再犯：新環境部署嚴格照 OPS.md 順序（先跑 schema 再註冊）；診斷用 `diagnose.sql`。

## L-003 本機 runtime 陷阱：jq 不存在、python 是假捷徑（2026-07-07，harness 建置實測）

- 症狀：依賴 `jq` 或 `python` 的腳本／hooks 在本機靜默失敗或無輸出，防線形同虛設。
- 根因：Windows 環境無 jq；`python` 是 WindowsApps 商店假捷徑（`--version` 無輸出）。
- 解法：所有腳本一律用 Node（v24.18.0）單檔 `.mjs`。
- 防再犯：ENV-FACTS §2 列明可用／不可用 runtime；doctor.mjs 開機自檢；新腳本交付前必須實跑一次。
