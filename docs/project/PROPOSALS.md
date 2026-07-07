# PROPOSALS — 待 User 裁決的提案

> FREE（追加提案）。凡想改 FROZEN 檔、改 settings、改全域環境 → 寫在這裡等 User 裁決，不得先斬後奏。
> 格式：編號／日期／提案內容／動機（附證據）／風險。User 裁決後把結論寫回該條並標 [已採納]/[已否決]。

## P-001 全域插件 ui-ux-pro-max 改為按專案啟用（2026-07-07，Fable 5）

- 提案：`~/.claude/settings.json` 移除 `enabledPlugins` 中的全域啟用，只在真的做 UI 設計的專案以專案層 settings 啟用。
- 動機：該插件注入 8+ 設計類 skills 到每個 session，觸發詞寬鬆（design/create/fix），弱模型易誤觸發；亦增加常駐 token（A 診斷書痛點 2）。
- 風險：需要 UI 設計時要先手動啟用（一行設定）。
- 狀態：**[已採納]** 2026-07-07 User 核准，已自 `~/.claude/settings.json` 移除全域啟用（備份 settings.json.bak-20260707；marketplace 註冊保留，重新啟用只需一行）。

## P-002 清理 .claude/settings.local.json 歷史 allow 規則（2026-07-07，Fable 5）

- 提案：42 行一次性 allow（repro 腳本、特定 curl、pkill 等）多數已無對應檔案，建議清空重建，只保留 `git *` 常用項與 ENV-FACTS §3 驗證指令。
- 動機：殘留規則含過時的具體 URL/token 參數樣板，可讀性差且暗示弱模型模仿舊做法。
- 風險：清掉後常用指令會重新跳權限確認（可逐步重建）。
- 狀態：**[已採納]** 2026-07-07 User 核准，已重建為最小清單（git 基本操作＋ENV-FACTS §3 驗證指令＋doctor；**移除了原有的 `Bash(git push *)` 免確認**）。備份 settings.local.json.bak-20260707。

## P-003 對抗審查殘餘發現（低嚴重度，未修，2026-07-07）

- block-push-protected.mjs 以 `\b分支名\b` 比對，含子字串的分支（如 `feature-master-fix`）會被誤攔——方向安全（過度保護），誤攔時請 User 自行 push 或改分支名。
- doctor.mjs 的 verifyCommands 逐條通過時靜默計數，PASS 訊息數與 pass 統計不一一對應（外觀問題，不影響判定）。
- shell 重導向寫入可繞過 protect-frozen hook——已如實記載於 A 診斷書「已知防線缺口」，靠規則層＋verifier 兜底。
- 狀態：記錄在案，暫不修（修復成本＞風險）。

## P-004 刪除已作廢草稿包 claude-harness/（2026-07-07，Fable 5）

- 提案：刪除 repo 內 `claude-harness/` 整個資料夾（未版控）。
- 動機：內含與正式 harness 措辭不同的舊規則檔（C-DISPATCH、D-JUDGMENT、ENV-FACTS 等），弱模型全 repo 搜尋會撈到舊規則照做（對抗審查發現 #7）。已放置 DEPRECATED.md 警示＋ENV-FACTS §6 標記為禁讀。
- 風險：無（正式版已吸收其全部有效內容；原始任務書即本次對話輸入）。
- 狀態：**[已採納]** 2026-07-07 User 核准，資料夾已刪除。

<!-- 新提案往下加：P-005 ... -->
