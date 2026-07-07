# OPS — 部署、維運與技術債

> 內容遷移自舊 CLAUDE.md（2026-07-07，對照見 MIGRATION-LOG.md）。FREE：部署方式或技術債變動後應同步更新。
> ⚠️ 動手前先讀 ENV-FACTS §4（危險操作）：push master ＝ 立即上線。

## 首次部署步驟（新環境重建用）

1. 到 [supabase.com](https://supabase.com) 建立免費專案。
2. Dashboard → **Authentication → Sign In / Up → Email → 關閉「Confirm email」**（必要！學生帳號用 `帳號名@vocab.local` 虛擬 email，收不到確認信）。
3. Dashboard → SQL Editor → 貼上 `vocab-app/supabase/schema.sql` 全文執行。
4. Dashboard → Project Settings → API → 複製 Project URL 與 anon key，填入 `public/js/config.js`。
5. 把 `vocab-app/public/` 部署到靜態空間，或本機測試：`npx serve vocab-app/public`。
6. 開網站 → 「建立老師帳號」分頁註冊 → **系統中第一個註冊的帳號自動成為老師**（`handle_new_user` trigger 判斷）。
7. 老師後台 → 單字集 → 「匯入示範資料」可一鍵建立 2 個示範單字集（各 15 字）。

## 正式部署（GitHub Pages）

- **正式網址**：https://ideafused3d-bot.github.io/-vocabquest/
- **原始碼**：https://github.com/ideafused3d-bot/-vocabquest
- **部署方式**：`.github/workflows/deploy-pages.yml` — push 到 `master` 分支時，GitHub Actions 自動把 `vocab-app/public/`（只有這個子資料夾）打包發布到 GitHub Pages。
- **一次性設定**（已完成，記錄供未來參考）：repo → Settings → Pages → Source 選 **GitHub Actions**（不是 "Deploy from a branch"）；沒設這個 workflow 會失敗並顯示 `Get Pages site failed`。
- **`public/js/config.js` 有跟著進版控——刻意的，不是疏漏**：純靜態網站無建置流程，無法部署時注入設定；Supabase anon key 依官方設計本來就是瀏覽器端公開值，真正防線是 RLS。專案完全沒有使用、也沒儲存過 `service_role` key（那個絕不能外流）。
- **部署驗證紀錄**（2026-07-04）：Playwright 對正式網址跑過完整登入/登出流程（含 Supabase 驗證請求、跨網域 CORS），正常無誤，Console 無錯誤。
- 替代方案（保留未用）：想換 Netlify/Vercel 時，刪掉此 workflow、該平台連動同一 repo（Publish directory 設 `vocab-app/public`，Build command 留空）即可。

## 已知技術債 / 未完成

1. **Tailwind Play CDN 不適合正式上線**（每次載入即時編譯、體積大）。上線前應改 Tailwind CLI 預編譯。三份 HTML 的 `tailwind.config` 重複，需同步修改。
2. **答案對錯判定在前端**：`record_answer` 相信前端傳的 `p_correct`，學生理論上可開 DevTools 作弊。嚴格防範需把出題+判題搬進 DB 函式或 Edge Function。
3. **無法刪除學生／重設密碼**：需要 service_role key（不能放前端）。目前只能在 Supabase Dashboard → Authentication 手動操作。
4. **老師只有一位的假設**：`is_teacher()` 允許任何老師管理所有資料；第一個註冊帳號成為老師的 bootstrap 機制，若被搶註需去 DB 手動改 `profiles.role`。
5. **練習資料全量載入**：學生端把被指派的所有單字/進度一次抓回前端算佇列。單字數千級以上需改 DB 端查詢（view 或 RPC）。
6. **每題作答都打一次 `record_answer`**：離線或網路差會掉進度（有 toast 提示但不重試）。可加本地佇列重送。
7. **無單元測試、無 CI**（驗證手段見 ENV-FACTS §3）。
8. **發音品質依裝置而異**（Web Speech API）；未來可讓老師上傳音檔，播放優先音檔、fallback TTS。
9. **帳號建立順序陷阱** → 已轉為踩坑紀錄 LESSONS L-002。
10. **靜態檔案必須整組部署** → 已轉為踩坑紀錄 LESSONS L-001。

## 測試帳號

資料庫可能存在診斷用測試帳號 `ctest01@vocab.local` / `ctest02@vocab.local`（密碼 test123456），可在 Supabase Authentication → Users 刪除。刪除任何帳號屬正式 DB 操作，需 User 同意（ENV-FACTS §4.5）。
