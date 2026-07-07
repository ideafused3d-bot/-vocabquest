# CLAUDE.md — VocabQuest 路由中心

> 本檔只做三件事：紅線、開機程序、路由。詳細知識在被路由的檔案裡，**不要往本檔堆內容**（上限 120 行，doctor.mjs 會機器檢查）。
> harness 結構與權限總表：`docs/harness/INDEX.md`。

## 專案一句話

VocabQuest — 家教老師的單字練習平台（純靜態前端 + Supabase）。程式碼全在 `vocab-app/`。

## 🚨 紅線（違反任一條＝事故，沒有例外）

1. **push `master` ＝ 立即部署正式站**（真實師生在用）。日常一律在 feature 分支工作；合併與推送 master 需 User 明確同意。
2. `vocab-app/public/` 靜態檔是一整組，禁止只部署或替換單一檔案（教訓見 LESSONS L-001）。
3. 對正式 Supabase 的任何寫入性操作（執行 SQL、刪帳號）需 User 同意；`service_role` key 絕不可引入 repo。
4. 根目錄 `index.html` 是無關的舊示範，不要動、不要混改。
5. `docs/harness/` 全部 FROZEN 唯讀。想修改 → 寫提案到 `docs/project/PROPOSALS.md`，等 User 裁決。
6. 品味決策（視覺美感、文案語氣、產品取捨）：產出 2–3 方案＋只含可驗證事實差異的利弊表＋標記 `[品味決策-需User拍板]`，禁止自行拍板。

## 開機程序（每個新 session 依序做）

1. 跑 `node docs/harness/scripts/doctor.mjs`（或指令 `/doctor`）；有 FAIL 先回報 User 再開工。
2. 依路由表讀「本次任務需要的」檔案就好，不要全部讀。
3. 動手前查 `docs/project/ENV-FACTS.md` §4（危險操作清單）。

## 路由表（主題 → 檔案）

| 你要做／查的事 | 讀這裡 |
|---|---|
| 環境事實：模型清單、runtime、驗證指令、危險操作、外部服務、目錄地圖 | `docs/project/ENV-FACTS.md`（§1–§6） |
| 產品規格：DB schema、業務規則（SRS／XP／統計口徑）、已實作功能 | `docs/project/SPEC.md` |
| 部署、維運、技術債、擴充切入點、測試帳號 | `docs/project/OPS.md` |
| 派工給 subagent、選模型、升降級 | `docs/harness/C-MODEL-DISPATCH.md` |
| 判斷該不該換路徑、算不算完成、該不該熔斷停下問 User | `docs/harness/D-JUDGMENT-MATRIX.md` |
| 派工 prompt 怎麼寫（搜尋／實作／重構／審查四式） | `docs/harness/E-PROMPT-TEMPLATES.md` |
| 踩坑了、學到東西、想改規則 | `docs/harness/F-KNOWLEDGE-PROTOCOL.md` |
| 過往踩坑紀錄／已解出的固定模式 | `docs/project/LESSONS.md`、`docs/project/PLAYBOOK.md` |
| harness 檔案結構、FROZEN／FREE 權限 | `docs/harness/INDEX.md` |
| 工作流痛點診斷與能力極限 | `docs/harness/A-DIAGNOSIS.md` |
| 舊 CLAUDE.md 的某條規則去哪了 | `docs/project/MIGRATION-LOG.md` |
| 把 harness 裝到新專案 | `docs/harness/INSTALL-NEW-PROJECT.md` |

## 驗證鐵律

- 改了 `vocab-app/public/js/` 任何檔 → 必跑 ENV-FACTS §3 的最低驗證組合（四條 `node --check`），輸出貼進回報。
- 「完成」的定義以 `docs/harness/D-JUDGMENT-MATRIX.md` §2 為準——沒實跑驗證指令不准回報完成。
- 實作者不自我驗收：交付前派 `verifier` agent 依 C 守則 §4 隔離驗證。

## 工作流摘要（細則一律以 C 守則為準）

- 主對話是指揮官：只決策、派工、驗收；大批量讀檔／搜尋派 `scout` 或 Explore agent，只收精簡結論。
- 模型階梯：Haiku（機械批次）→ Sonnet（主力）→ Opus（連錯升級的終點）。
- 收工前跑 `/reflect`：踩坑寫進 LESSONS（格式見 F §2），規則問題寫 PROPOSALS。
