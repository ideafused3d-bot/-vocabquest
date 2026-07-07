# INSTALL — 把 harness 佈署到新專案

> FROZEN。給任何要在別的專案安裝這套 harness 的人／模型。**用 Sonnet 執行即可，不需高階模型**——安裝是機械流程，判斷力已externalize在檔案裡。

## §1 複製清單（通用層 → 新專案，路徑一對一）

從模板來源（本 repo 或模板倉）複製以下檔案到新專案的相同路徑：

```
docs/harness/                 ← 整個資料夾（含 scripts/）
.claude/agents/verifier.md
.claude/agents/scout.md
.claude/commands/doctor.md
.claude/commands/reflect.md
```

**不要複製** `docs/project/`（那是各專案自己的事實）與 `CLAUDE.md`（各專案自己生成）。

## §2 生成專案層（跑 00-BOOTSTRAP）

用 Sonnet 開新 session，貼上 `docs/harness/00-BOOTSTRAP.md` 全文執行。它會：
1. 診斷新專案（技術棧、驗證指令、危險操作、既有 CLAUDE.md）。
2. 產出 `docs/project/`：ENV-FACTS.md（照 INDEX 的 § 契約）、harness-config.json、LESSONS/PLAYBOOK/PROPOSALS 骨架、（若有既有 CLAUDE.md）SPEC/OPS 抽離＋MIGRATION-LOG。
3. 生成 ≤120 行的路由中心 CLAUDE.md（既有者先備份 .bak-YYYYMMDD）。
4. 跑 `node docs/harness/scripts/doctor.mjs` 直到零 FAIL。
5. 產出安裝同意清單（hooks 啟用等）交 User 逐項裁決。

## §3 升級傳播規則

- **FROZEN 檔（整個 docs/harness/、agents、commands）**：可從模板倉整檔覆蓋更新——這正是它們禁止寫入專案事實的原因（判斷標準：覆蓋後不改一字也不產生錯誤指引）。
- **FREE 檔（docs/project/ 全部、CLAUDE.md）**：**永不覆蓋**。各專案自己的事實與教訓，升級不得動。
- 覆蓋更新後必跑 doctor：若新版通用層引用了新的 ENV-FACTS 段落，doctor 會 FAIL 提示補段落。

## §4 通用型教訓回流模板倉

各專案 LESSONS 裡若出現「跟本專案技術棧無關、任何專案都會踩」的教訓（判準：把專案名稱與路徑遮掉後，敘述仍然成立）：

1. 在該專案 PROPOSALS.md 寫一條「建議回流模板倉」提案，附 LESSONS 編號。
2. User 同意後，把教訓改寫成通用敘述，提交到模板倉（改 A 診斷書或對應規則檔）。
3. 下次各專案從模板倉覆蓋更新 FROZEN 檔時自動獲得。

## §5 模板倉（建議，尚未建立）

建議把通用層抽成獨立 git repo 集中管理。從任何已安裝專案建立（Git Bash）：

```bash
mkdir -p ~/Documents/claude-harness-template && cd ~/Documents/claude-harness-template && git init
mkdir -p docs .claude
cp -r <已安裝專案路徑>/docs/harness docs/
cp -r <已安裝專案路徑>/.claude/agents <已安裝專案路徑>/.claude/commands .claude/
git add -A && git commit -m "harness template v1.0"
```

之後所有專案照 §1 從模板倉複製、照 §3 傳播升級。在那之前，首次建置專案的 `docs/harness/` 就是事實上的模板來源。
