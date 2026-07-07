# MIGRATION-LOG — 舊 CLAUDE.md 遷移對照表

> 2026-07-07 由 Fable 5 執行。舊檔完整備份：`CLAUDE.md.bak-20260707`（145 行）。
> 本表 FROZEN：這是歷史紀錄，不更新。每條舊規則的新去向如下，**無任何規則被丟棄**。

| 舊 CLAUDE.md 章節（行號） | 去向 |
|---|---|
| 專案是什麼（5–10） | SPEC.md「專案是什麼」；根目錄 index.html 警告同時升級為 CLAUDE.md 紅線 4 |
| 資料夾結構（12–35） | SPEC.md「資料夾結構」；精簡版目錄地圖進 ENV-FACTS §6 |
| 技術棧＋設計 token（37–48） | SPEC.md「技術棧」（token 三處重複需同步的警告保留原文） |
| 首次部署步驟（50–58） | OPS.md「首次部署步驟」 |
| 正式部署 GitHub Pages（60–68） | OPS.md「正式部署」；「push master=部署」升級為 CLAUDE.md 紅線 1 ＋ ENV-FACTS §4.1；網址/repo/anon key 事實進 ENV-FACTS §5 |
| 資料庫 Schema＋DB 函式＋RLS（70–85） | SPEC.md「資料庫 Schema」 |
| 業務規則含三項統計指標（87–107） | SPEC.md「業務規則」（統計口徑 2026-07-04 驗證紀錄原文保留） |
| 已實作功能（109–115） | SPEC.md「已實作功能」 |
| guide.html 存取限制（117–123） | SPEC.md「使用手冊存取限制」 |
| 技術債 1–8（127–134） | OPS.md「已知技術債」1–8（原文保留） |
| 技術債 9 帳號建立順序陷阱（135） | LESSONS.md L-002（轉為踩坑格式）；測試帳號資訊進 OPS.md「測試帳號」 |
| 技術債 10 靜態檔整組部署（136） | LESSONS.md L-001（轉為踩坑格式）＋ CLAUDE.md 紅線 2 ＋ ENV-FACTS §4.3 |
| 擴充功能建議切入點（138–146） | SPEC.md「擴充功能建議切入點」 |

新增（非遷移）：紅線 5–6、開機程序、路由表、驗證鐵律、工作流摘要——來自 harness 建置（見 docs/harness/）。

## 附錄 A — 首次建置紀錄（2026-07-07，Fable 5）

- 全部交付完成：INDEX、ENV-FACTS＋harness-config、A、CLAUDE.md 重寫＋SPEC/OPS 抽離、C/D/E/F/G、agents×2、commands×2、hooks×2＋doctor（hooks 模擬測試通過、doctor 實跑零 FAIL）、INSTALL＋00-BOOTSTRAP、LESSONS（L-001~003）／PLAYBOOK（PB-001）／PROPOSALS（P-001~004）。
- 對抗審查：fresh-context 審查員回報 21 條發現，高嚴重度 14 條全數修復，殘餘低嚴重度記錄於 PROPOSALS P-003。
- 工作分支：`harness/setup`（未推送）；舊 CLAUDE.md 備份：`CLAUDE.md.bak-20260707`。

## 附錄 B — 草稿包對照（claude.ai 盲產版痛點的本機證實狀態）

- 草稿痛點 1「主對話 Context 洪水」：**證實**（舊 CLAUDE.md 145 行知識傾倒常駐＋全域插件注入 8+ skills）→ 正式版 A 痛點 2。
- 草稿痛點 2「自我驗證閉環」：屬行為模式，靜態掃描無法「證實」，結構性成立 → 阻斷內建於 C §4＋D §2。
- 草稿痛點 3「工具面過載與誤用」：**部分證實**——全域插件成立（PROPOSALS P-001）；「MCP 常駐 token 過高」在本機**不成立**（mcpServers 全空）。
- `/context` 常駐 token 實際數字：`UNVERIFIED`（CLI 互動指令無法程式化取得）。
- 草稿包本體 `claude-harness/` 已標 DEPRECATED，刪除提案 P-004。
