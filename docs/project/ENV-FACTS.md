# ENV-FACTS — 本機與本專案事實（唯一來源）

> 通用層規則文件以「ENV-FACTS §N」引用本檔。§ 編號是固定契約（見 INDEX），只能更新內容、不能改編號。
> 每條事實附【證據】與日期。更正事實時：改內容＋更新證據與日期，不確定的標 `UNVERIFIED`。
> 最後校正：2026-07-07（Fable 5 Phase 0 實測）

## §1 可用模型清單與塌縮規則

| 層級 | 模型 ID | 用途 |
|---|---|---|
| 天花板 | claude-opus-4-8 | 疑難雜症、連錯升級的終點、架構決策 |
| 主力 | claude-sonnet-5 | 日常開發、派工實作、驗收 |
| 廉價批次 | claude-haiku-4-5-20251001 | 機械性批次任務（已有 PLAYBOOK 模式可套用時） |
| （已離場） | claude-fable-5 | 僅 2026-07-07 建置 session 使用過，日常不可假設可用 |

- 塌縮規則：若某層不可用（額度、棄用），由上一層接手其職責；Opus 不可用時 Sonnet 為天花板，且 D 矩陣的熔斷門檻收緊一級（連錯 1 次即熔斷問 User）。
- Subagent 面板（Agent tool 可用類型）：`Explore`（唯讀搜尋）、`general-purpose`、`Plan`、專案自建 `verifier`／`scout`（.claude/agents/）。
- 【證據】環境宣告的模型 ID 清單＋Agent 面板（2026-07-07 session）。

## §2 執行環境

- OS：Windows 11 Home（build 26200）。Shell：PowerShell 5.1（主）＋ Git Bash（MINGW64）。兩者語法互斥，腳本必須明確指定跑在哪個 shell。
- Claude Code：v2.1.201。【證據】`claude --version`
- **可用 runtime：Node v24.18.0（npm 11.16.0）— hooks／腳本唯一可靠執行器。**【證據】`node --version`
- 不可用／不可依賴：`jq`（不存在）、`python`（WindowsApps 假捷徑，`--version` 無輸出）、`py`（不存在）。腳本禁止依賴這三者。【證據】2026-07-07 PATH 全掃與實跑。
- 全域插件 `ui-ux-pro-max` 目前全域啟用，會注入 8+ 設計類 skills 到每個 session（處置提案見 PROPOSALS）。【證據】`~/.claude/settings.json`
- MCP：本機 mcpServers 全空；僅 claude.ai 雲端連接器 Notion／Google Drive（未認證）。【證據】`~/.claude.json`

## §3 驗證指令（VocabQuest）

最低驗證組合（任何 JS 改動後必跑，全過才算通過語法關）：

```bash
node --check vocab-app/public/js/common.js
node --check vocab-app/public/js/student.js
node --check vocab-app/public/js/teacher.js
node --check vocab-app/public/js/config.js
```

- 本機煙霧測試：`npx serve vocab-app/public` 起本機站 → 瀏覽器或 Playwright 走登入流程。
- 端對端：臨時 Playwright 腳本（`npm install playwright` 後以 `node <腳本>.mjs` 跑；歷史上驗過正式站登入/登出，見 OPS.md）。
- **本專案無單元測試、無 lint、無 package.json、無 CI 測試**——「測試都過了」這句話在本專案沒有意義，驗收必須指名上述具體指令。【證據】repo 全掃無 package.json/test 檔（2026-07-07）。
- harness 自檢：`node docs/harness/scripts/doctor.mjs`

## §4 危險操作與部署觸發

1. **push 到 `master` ＝ 立即部署正式站**（GitHub Actions 把 `vocab-app/public/` 發布到 GitHub Pages，真實師生在用）。日常一律在 feature 分支工作；合併與 push master 需 User 明確同意。【證據】`.github/workflows/deploy-pages.yml` on.push.branches=[master]
2. 禁止改名/刪除 `master` 分支（部署 workflow 綁定）。
3. `vocab-app/public/` 的靜態檔是一整組，部署不可只換單檔（依賴順序陷阱，見 LESSONS L-001）。
4. Supabase schema 變更（`schema.sql`）是手動貼到 SQL Editor 執行的——改 SQL 檔不等於已生效；對正式 DB 的任何執行需 User 同意。
5. 資料庫含真實學生資料：禁止對正式 Supabase 跑破壞性 SQL、禁止刪帳號，測試帳號處理見 OPS.md。
6. 需 User 同意才能做：合併/啟用 hooks、改 `.claude/settings*.json`、改 FROZEN 檔、對外發布任何內容。
7. 通用禁令（任何專案都適用）：`git push --force`；未經同意的 `git push`；單次刪除 >5 個檔或任何未版控檔案；讀寫 secrets；修改 `.github/workflows/`（CI/部署設定）。

## §5 外部服務與正式環境

- 正式站：https://ideafused3d-bot.github.io/-vocabquest/
- GitHub repo：https://github.com/ideafused3d-bot/-vocabquest（remote origin，分支 master）
- Supabase 專案：`xidbdnupeyhiixvicyke.supabase.co`（PostgreSQL + Auth + RLS）
- `public/js/config.js` 內的 anon key **刻意進版控**（官方設計的公開值，防線在 RLS）；`service_role` key 從未存在於 repo，也絕不可引入。【證據】舊 CLAUDE.md 部署節（已遷移至 OPS.md）

## §6 目錄地圖

- `vocab-app/public/` — 全部前端程式碼（頁面 HTML ＋ `js/` 四檔）。
- `vocab-app/supabase/` — schema.sql／repair-profiles.sql／diagnose.sql（手動執行的 SQL）。
- 根目錄 `index.html` — **無關的舊 SaaS landing page 示範，不要動、不要混改**。
- `docs/harness/` — 通用層（FROZEN）；`docs/project/` — 專案層。
- `.claude/settings.local.json` — 歷史累積的一次性 allow 規則（清理提案見 PROPOSALS）。
