# PROPOSALS — 待 User 裁決的提案

> FREE（追加提案）。凡想改 FROZEN 檔、改 settings、改全域環境 → 寫在這裡等 User 裁決，不得先斬後奏。
> 格式：編號／日期／提案內容／動機（附證據）／風險。User 裁決後把結論寫回該條並標 [已採納]/[已否決]。

## P-001 全域插件 ui-ux-pro-max 改為按專案啟用（2026-07-07，Fable 5）

- 提案：`~/.claude/settings.json` 移除 `enabledPlugins` 中的全域啟用，只在真的做 UI 設計的專案以專案層 settings 啟用。
- 動機：該插件注入 8+ 設計類 skills 到每個 session，觸發詞寬鬆（design/create/fix），弱模型易誤觸發；亦增加常駐 token（A 診斷書痛點 2）。
- 風險：需要 UI 設計時要先手動啟用（一行設定）。
- 狀態：待裁決（列於 Phase 2 同意清單）。

## P-002 清理 .claude/settings.local.json 歷史 allow 規則（2026-07-07，Fable 5）

- 提案：42 行一次性 allow（repro 腳本、特定 curl、pkill 等）多數已無對應檔案，建議清空重建，只保留 `git *` 常用項與 ENV-FACTS §3 驗證指令。
- 動機：殘留規則含過時的具體 URL/token 參數樣板，可讀性差且暗示弱模型模仿舊做法。
- 風險：清掉後常用指令會重新跳權限確認（可逐步重建）。
- 狀態：待裁決（列於 Phase 2 同意清單）。

<!-- 新提案往下加：P-003 ... -->
