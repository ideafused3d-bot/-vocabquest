# HARNESS INDEX — 檔案結構與權限總表

> 本檔是 harness 的唯一結構定義。任何 session 對「哪個檔案管什麼、誰能改」有疑問，以本檔為準。
> 版本：1.0 ｜ 建置：2026-07-07，Claude Fable 5（本 session 後由 Sonnet/Opus/Haiku 長期運作）

## 權限標記定義

- **FROZEN**：規則文件。日常 session 唯讀。發現錯誤或想修改 → 寫入 `docs/project/PROPOSALS.md`，等 User 裁決。絕不直接改。
- **FREE**：工作文件。可依 `F-KNOWLEDGE-PROTOCOL.md` 規定的格式與門檻自行追加／更新。

## 通用層（全部 FROZEN；設計目標：原封複製到任何專案都不產生錯誤指引）

| 檔案 | 職責 |
|---|---|
| `docs/harness/INDEX.md` | 本檔：結構定義、權限總表、ENV-FACTS 段落契約 |
| `docs/harness/A-DIAGNOSIS.md` | 漏水診斷書：三大痛點＋物理阻斷方案＋能力極限聲明 |
| `docs/harness/C-MODEL-DISPATCH.md` | 模型調度：指揮官不下場、派工三件套、升降級階梯、隔離驗證 |
| `docs/harness/D-JUDGMENT-MATRIX.md` | 判斷力外化：換路徑信號、完成判準、熔斷條件（各附正反例） |
| `docs/harness/E-PROMPT-TEMPLATES.md` | 派工 prompt 四式：搜尋研究／功能實作／重構／審查 |
| `docs/harness/F-KNOWLEDGE-PROTOCOL.md` | 知識迭代：誰能改什麼、踩坑格式、精簡門檻 |
| `docs/harness/G-HANDOFF-LETTER.md` | 交接信：關鍵提醒、制度退化模式與預防、未竟事項 |
| `docs/harness/INSTALL-NEW-PROJECT.md` | 新專案佈署步驟＋升級傳播規則 |
| `docs/harness/00-BOOTSTRAP.md` | 新專案初始化任務書（Sonnet 可執行，產出專案層檔案） |
| `docs/harness/scripts/doctor.mjs` | 開機自檢（Node）：路由完整性、行數上限、防線狀態 |
| `docs/harness/scripts/hooks/block-push-protected.mjs` | hook：攔截推送保護分支（**未啟用**，見 Phase 2 同意清單） |
| `docs/harness/scripts/hooks/protect-frozen.mjs` | hook：攔截寫入 FROZEN 檔（**未啟用**，同上） |
| `docs/harness/scripts/hooks/settings-hooks.proposed.json` | 上述 hooks 的 settings.json 合併草案（**未合併**） |
| `.claude/agents/verifier.md` | 隔離驗證 agent（fresh context，只驗收不修改） |
| `.claude/agents/scout.md` | 唯讀偵察 agent（大批量讀檔搜尋，回報精簡結論） |
| `.claude/commands/doctor.md` | `/doctor`：跑自檢並解讀結果 |
| `.claude/commands/reflect.md` | `/reflect`：收工反思，依 F 協議沉澱踩坑與提案 |

## 專案層（承載本專案全部事實；隨專案各自演化，升級時永不覆蓋）

| 檔案 | 權限 | 職責 |
|---|---|---|
| `CLAUDE.md` | 結構 FROZEN／路由表列可追加 | 路由中心，全文 ≤120 行 |
| `docs/project/ENV-FACTS.md` | FREE（更正事實須附證據與日期） | 環境事實唯一來源，§ 編號為固定契約（見下） |
| `docs/project/harness-config.json` | FROZEN | hooks 與 doctor 讀取的機器可讀設定（保護分支、保護路徑） |
| `docs/project/SPEC.md` | FREE | 專案規格：資料模型、業務規則、已實作功能 |
| `docs/project/OPS.md` | FREE | 部署、維運、技術債、擴充切入點 |
| `docs/project/LESSONS.md` | FREE | 踩坑紀錄（固定格式見 F §2） |
| `docs/project/PLAYBOOK.md` | FREE | 高階模型解出的可重複模式（降級批次套用的依據） |
| `docs/project/PROPOSALS.md` | FREE | 對 FROZEN 檔的修改提案，等 User 裁決 |
| `docs/project/MIGRATION-LOG.md` | FROZEN | 舊 CLAUDE.md 每條規則的去向對照 |

## ENV-FACTS 段落契約（不得變動編號；通用層一律以「ENV-FACTS §N」引用事實）

| 段落 | 內容 |
|---|---|
| §1 | 可用模型清單、各層用途、缺級塌縮規則 |
| §2 | 執行環境：OS、shell、可用 runtime、已知不可用工具 |
| §3 | 驗證指令：本專案的最低驗證組合與完整驗證組合 |
| §4 | 危險操作清單：部署觸發條件、禁止事項、需 User 同意事項 |
| §5 | 外部服務與正式環境：網址、儀表板、金鑰性質 |
| §6 | 目錄地圖：程式碼在哪、什麼不要碰 |

## 讀取順序（每個新 session）

0. 跑 `node docs/harness/scripts/doctor.mjs`（有 FAIL 先回報 User）→ 1. `CLAUDE.md`（路由中心）→ 2. 按當次任務循路由表讀對應檔 → 3. 動手前查 `ENV-FACTS §4`（危險操作）→ 4. 派工前讀 `C` 與 `E`。

## 建置紀錄

首次建置（2026-07-07，Fable 5）的進度勾稽與草稿包對照，存於安裝專案的 `docs/project/MIGRATION-LOG.md` 附錄（專案層，不隨通用層複製）。
