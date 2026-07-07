# 00-BOOTSTRAP — 新專案初始化任務書（Sonnet 可執行）

> FROZEN。前提：通用層已照 INSTALL-NEW-PROJECT.md §1 複製完成。把本檔全文作為任務執行。
> 你不需要高階模型的判斷力——照步驟做、有證據才寫、查不到標 `UNVERIFIED`。

## Phase B0 — 唯讀診斷（禁止寫入）

逐項執行並保留證據（指令輸出）：

1. `git log --oneline -5`、`git branch -a`、目前分支。
2. 技術棧：讀 package.json／pyproject.toml／go.mod 等設定檔（存在哪個讀哪個），記下語言、框架、測試/lint/建置指令；**能實跑就實跑一次**記錄結果。
3. 部署觸發：讀 `.github/workflows/`（或其他 CI 設定），找出「push 哪個分支會發生什麼」——這決定保護分支清單。
4. 既有 CLAUDE.md：存在則 `wc -l` 並通讀，標記哪些是「規則」哪些是「知識」。
5. runtime 盤點：`node --version`；沿用模板假設「腳本一律 Node」，若本機 Node 不可用 → 停下回報 User，harness 腳本無法運作。
6. 危險事實：正式環境網址、真實使用者資料、secrets 所在——凡「一個指令就能造成不可逆傷害」的都列出來。

## Phase B1 — 生成專案層（依序，每檔寫完立即落檔）

1. `docs/project/ENV-FACTS.md`：照 INDEX「ENV-FACTS 段落契約」§1–§6 逐段填入 B0 證據；§1 模型清單抄現行環境宣告的可用模型；查不到的欄位寫 `UNVERIFIED`，禁止留空或編造。
2. `docs/project/harness-config.json`：照本 repo 同名檔的欄位結構填：protectedBranches（B0 第 3 步的結論）、frozenPaths（至少 `docs/harness/`、本檔、MIGRATION-LOG）、claudeMdMaxLines: 120、verifyCommands（B0 第 2 步實測過的指令）、requiredEnvFactsSections、overrideEnvVar。
3. 既有 CLAUDE.md 處理：備份為 `CLAUDE.md.bak-YYYYMMDD` → 內容分流：規格知識 → `docs/project/SPEC.md`；部署維運/技術債 → `docs/project/OPS.md`；血淚教訓 → `docs/project/LESSONS.md`（照 F §2 格式）→ 每條去向記入 `docs/project/MIGRATION-LOG.md`（一條都不准丟）。
4. 新 CLAUDE.md：抄本 repo CLAUDE.md 的**結構**（紅線／開機程序／路由表／驗證鐵律／工作流摘要），把專案事實換成本專案的；紅線第 1 條必須是 B0 第 6 步找到的最危險操作。≤120 行。
5. `docs/project/PLAYBOOK.md`、`docs/project/PROPOSALS.md`：抄本 repo 對應檔的檔頭格式說明，內容清空。

## Phase B2 — 驗證與交付

1. 跑 `node docs/harness/scripts/doctor.mjs`，修到零 FAIL（修的是專案層檔案，不是改 doctor）。
2. 模擬測 hooks（不啟用）：構造 payload 餵 `block-push-protected.mjs`（push 保護分支應 exit 2）與 `protect-frozen.mjs`（寫 docs/harness/ 應 exit 2），貼測試輸出。
3. 向 User 交付：建立了哪些檔、ENV-FACTS 中的 `UNVERIFIED` 清單、安裝同意清單（啟用 hooks＝合併 settings-hooks.proposed.json、其他 settings 變更）——逐項等 User 點頭，未同意前不得執行。

## 失敗處理

任一步卡住 2 次 → 不要繞道硬做，記下失敗軌跡，回報 User（這正是 D 矩陣 §3 熔斷的精神；安裝期間 harness 尚未生效，但原則相同）。
