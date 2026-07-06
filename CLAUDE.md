# CLAUDE.md — 專案說明

> 給任何接手開發的 AI 模型／工程師：先讀完這份文件再動手。

## 專案是什麼

**VocabQuest** — 家教老師用的單字練習平台。一位老師管理多位學生，老師自建單字集並指派給學生；學生用 SRS（間隔重複）練習單字、累積 XP 與連續天數。

⚠️ 注意：專案根目錄的 `index.html` 是**另一個獨立的舊任務**（SaaS landing page 示範），與 VocabQuest 無關，不要混在一起改。VocabQuest 全部在 `vocab-app/` 內。

## 資料夾結構

```
test-project/                   # git repo 根目錄（GitHub: ideafused3d-bot/-vocabquest）
├── .github/workflows/
│   └── deploy-pages.yml        # push 到 master 時自動把 vocab-app/public 發布到 GitHub Pages
├── index.html                  # （無關）舊的 SaaS landing page 示範
├── CLAUDE.md                   # 本文件
└── vocab-app/
    ├── supabase/
    │   ├── schema.sql          # 完整 DB schema + RLS + SRS 函式，貼到 Supabase SQL Editor 執行一次
    │   ├── repair-profiles.sql # 修復腳本：為 schema 執行「前」建立的帳號補建 profiles
    │   └── diagnose.sql        # 診斷腳本：列出所有帳號狀態 + 常用修復 SQL（老師救援等）
    └── public/                 # 純靜態前端，可部署到任何靜態空間
        ├── index.html          # 登入頁（含「首次建立老師帳號」分頁）
        ├── guide.html          # 使用手冊（老師/學生操作、拍照匯入單字、疑難排解；僅老師登入後可見，見下方「使用手冊存取限制」）
        ├── student.html        # 學生端外殼（視圖由 student.js 動態渲染）
        ├── teacher.html        # 老師端外殼（視圖由 teacher.js 動態渲染）
        └── js/
            ├── config.js       # ★ Supabase URL / anon key，部署前必填
            ├── common.js       # 共用：sb client、requireUser、levelInfo、speak、toast…
            ├── student.js      # 學生端全部邏輯（儀表板/練習/進度/錯題本）
            └── teacher.js      # 老師端全部邏輯（總覽/學生/單字集/指派/示範資料）
```

## 技術棧

| 層 | 技術 | 版本/來源 |
|---|---|---|
| UI | HTML + Tailwind CSS | Tailwind Play CDN（`cdn.tailwindcss.com`，設定 inline 在各 HTML 的 `tailwind.config`） |
| 字體 | Fredoka（英文標題）+ Nunito + Noto Sans TC | Google Fonts |
| 前端邏輯 | 原生 JavaScript（無框架、無打包器） | — |
| 資料庫/認證 | Supabase（PostgreSQL + Auth + RLS） | supabase-js v2 UMD CDN |
| 動畫 | canvas-confetti | 1.9.3 CDN |
| 發音 | Web Speech API（瀏覽器內建 TTS，`en-US`） | — |

設計 token（各 HTML 的 tailwind.config 中，三處重複，改時要同步）：
主色 `#EA580C` 珊瑚橘、輔色 `#F59E0B`、成功 `#16A34A`、學習中 `#4F46E5`、背景 `#FFF7ED`。

## 首次部署步驟

1. 到 [supabase.com](https://supabase.com) 建立免費專案。
2. Dashboard → **Authentication → Sign In / Up → Email → 關閉「Confirm email」**（必要！學生帳號用 `帳號名@vocab.local` 虛擬 email，收不到確認信）。
3. Dashboard → SQL Editor → 貼上 `vocab-app/supabase/schema.sql` 全文執行。
4. Dashboard → Project Settings → API → 複製 Project URL 與 anon key，填入 `public/js/config.js`。
5. 把 `vocab-app/public/` 部署到靜態空間，或本機測試：`npx serve vocab-app/public`（正式部署方式見下方「正式部署」章節）。
6. 開網站 → 「建立老師帳號」分頁註冊 → **系統中第一個註冊的帳號自動成為老師**（`handle_new_user` trigger 判斷）。
7. 老師後台 → 單字集 → 「匯入示範資料」可一鍵建立 2 個示範單字集（各 15 字）。

## 正式部署（GitHub Pages）

- **正式網址**：https://ideafused3d-bot.github.io/-vocabquest/
- **原始碼**：https://github.com/ideafused3d-bot/-vocabquest
- **部署方式**：`.github/workflows/deploy-pages.yml` — push 到 `master` 分支時，GitHub Actions 自動把 `vocab-app/public/`（只有這個子資料夾，repo 其他檔案不會公開發布）打包發布到 GitHub Pages。
- **一次性設定**（已完成，記錄供未來參考）：repo → Settings → Pages → Build and deployment → Source 選 **GitHub Actions**（不是預設的 "Deploy from a branch"）；沒設定這個 workflow 會失敗並顯示 `Get Pages site failed`。
- **`public/js/config.js` 有跟著一起進版控**：這是刻意的，不是疏漏。原因：這是純靜態網站、沒有建置流程，無法在部署時另外「注入」機密設定檔；而 Supabase anon key 依官方設計本來就是要曝露在瀏覽器端的公開值（每個 API 請求都會帶著送出），真正的資料防線是 Postgres 的 RLS 規則（見上方 RLS 摘要），不是這把 key 保密與否。專案裡完全沒有使用、也沒有儲存過 `service_role` key（那個才是真正絕對不能外流的）。
- **部署驗證紀錄**（2026-07-04）：用 Playwright 對正式網址跑過完整登入流程（含 Supabase 驗證請求、跨網域 CORS）、登出流程，皆正常無誤，Console 無錯誤訊息。
- 已保留但目前未使用的替代方案：`.github/workflows/deploy-pages.yml` 若之後想換成 Netlify/Vercel，直接刪掉這個 workflow、改用該平台連動同一個 GitHub repo（Publish directory 設 `vocab-app/public`，Build command 留空）即可，不影響其他檔案。

## 資料庫 Schema（`vocab-app/supabase/schema.sql`）

| 表 | 欄位 | 說明 |
|---|---|---|
| `profiles` | `id`(uuid, FK→auth.users), `role`('teacher'/'student'), `username`(unique), `display_name`, `xp`, `streak_days`, `last_active_date`, `created_at` | 由 trigger 自動建立；第一筆＝老師 |
| `word_sets` | `id`, `teacher_id`, `name`, `category`, `difficulty`('初級'/'中級'/'高級'), `created_at` | 單字集 |
| `words` | `id`, `set_id`(FK, cascade), `english`, `chinese`, `created_at` | 單字 |
| `assignments` | `id`, `set_id`, `student_id`, `assigned_at`, unique(set_id, student_id) | 指派關係 |
| `word_progress` | `id`, `student_id`, `word_id`, `box`(0-6), `next_review_at`, `correct_count`, `wrong_count`, `last_reviewed_at`, unique(student_id, word_id) | SRS 進度，只由 `record_answer` 函式寫入 |

**DB 函式（皆 security definer）**
- `is_teacher()` — RLS policy 用，判斷登入者是否為老師（避免 policy 遞迴）。
- `handle_new_user()` — auth.users insert trigger，自動建 profile；第一個帳號設為 teacher。
- `record_answer(p_word_id, p_correct, p_qtype)` — **SRS 核心**，前端唯一的寫進度入口。在 DB 端計算，學生無法竄改 XP。

**RLS 摘要**：學生只能讀自己的 profile/進度/被指派的單字集與單字；老師可讀寫全部（單字集/單字/指派）；`word_progress` 無 insert/update policy（只能走 `record_answer`）。

## 業務規則

- **SRS（Leitner 盒子制）**：box 0–6，間隔天數 `[0,1,2,4,7,15,30]`。答對 box+1（上限 6）、答錯 box−2（下限 0），`next_review_at = now + 間隔[box]`。**box ≥ 5 = 「已熟記」**（前端常數 `MASTERED_BOX`）。
- **單字狀態**：無進度紀錄＝未學習；box<5＝學習中；box≥5＝已熟記。
- **錯題本**：`wrong_count ≥ 2` 且未熟記（`isWrongBookWord()`）。

### 儀表板三項統計指標定義（2026-07-04 確認）

學生儀表板的「已熟記／待複習／錯題本」三個數字，計算邏輯集中在 `common.js` 的 `wordStatus()` / `isWrongBookWord()` 和 `student.js` 的 `stats()`：

| 指標 | 定義 | 說明 |
|---|---|---|
| 已熟記單字 | `box >= 5`（`MASTERED_BOX`） | SRS 間隔已拉長到 15 天以上；約等於「從頭連續答對 5 次且中途沒有大量答錯」。 |
| 待複習單字 | 該單字**已有** `word_progress` 紀錄，且 `next_review_at <= 現在` | 只算「已經練過、排程到期的舊單字」，**不含從未練習過的新單字**（新單字算「未學習」，走另一個計數）；跟 Anki 等主流 SRS 軟體的「到期複習數」口徑一致。 |
| 錯題本單字 | `wrong_count >= 2` 且 `box < 5`（尚未熟記） | 答錯滿 2 次即收錄；一旦後來練到熟記（box≥5）會自動移出錯題本，不會卡住不放。 |

這三個指標只取決於 `word_progress` 表的資料，**若學生帳號從未練習過任何單字，三項數字合理地全部顯示為 0**（不是 bug）。已用 `common.js`/`student.js` 的實際函式（用 Node vm 模組載入真實原始碼，而非重寫邏輯）餵合成測試資料驗證過，8 種狀態組合（已熟記×2、到期×2、錯題×2、全新×2）全部計算正確。
- **XP**：選擇題答對 +10、拼字答對 +15、答錯 +2（安慰分）。等級：升到下一級需 `目前等級×100` XP（累進），見 `levelInfo()`。
- **連續天數**：以台北時區日期計（DB 端 `Asia/Taipei`）。昨天有練 +1、今天已練不變、中斷歸 1。
- **練習佇列**：每輪上限 20 題（`SESSION_LIMIT`）。每日複習＝到期單字＋新單字；題型按奇偶題號輪替（偶＝選擇、奇＝拼字）。選擇題干擾項從學生被指派的所有單字抽 3 個，不足用 `FALLBACK_CHOICES` 墊。
- **帳號**：內部 email 一律 `<username>@vocab.local`（`toEmail()`）。老師新增學生用獨立的 `sbSignup` client（`persistSession:false`），避免 signUp 蓋掉老師 session。

## 已實作功能

**學生端**：儀表板（連續天數/已熟記/待複習/錯題數 + 等級進度條）、每日複習、單字集練習、錯題複習、兩種題型輪替（四選一選擇題、拼字填空+TTS 發音）、即時對錯回饋與答對統計、confetti 與升級動畫、進度總覽（三狀態比例 + 各單字集分解）、錯題本列表。

**老師端**：總覽（學生數/單字集數/總單字數/全體已熟記 + 近期活躍）、學生列表（streak/Lv/熟記數）、學生詳情（三狀態比例、被指派單字集進度、常錯 Top 10）、新增學生帳號、單字集 CRUD（名稱/分類/難度 + 單字逐列編輯 + 批次貼上「英文,中文」）、指派/取消指派學生、一鍵匯入示範資料、刪除單字集（confirm 保護）。

**共用**：帳密登入、角色導向（登入後自動進對應頁面）、RWD（手機底部導覽）、`prefers-reduced-motion` 支援、登入頁下方隱私告知文字（小字、非彈窗，告知會記錄學習資料、僅本人與老師可見）。

### 使用手冊（`guide.html`）存取限制（2026-07-06）

`guide.html` 只給老師用，學生不該看到入口也不該能直接開網址進去。做法：

- **入口**：原本登入頁下方的「📖 使用手冊」連結已移除；改放在 `teacher.html` 頂部列（`logout()` 按鈕旁邊）。學生端 `student.html` 完全沒有這個入口。
- **直接輸入網址的防護**：`guide.html` 內容預設用 `<body style="visibility:hidden">` 藏起來，載入 Supabase SDK / `config.js` / `common.js` 後呼叫 `requireUser('teacher')`（`common.js` 既有的登入守衛函式，其他頁面也是用它）——未登入會導回 `index.html`、登入但是學生身分會導回 `student.html`，只有老師會把 `visibility` 改回 `visible` 看到內容。跟 `teacher.html`/`student.html` 用的是同一套守衛邏輯，不是另外寫的規則。
- **注意**：這只擋得住「一般使用者照網址列打開頁面」。`guide.html` 本身是靜態檔案，內容還是會被下載到瀏覽器（只是 JS 執行前用 CSS 藏住），對於會開 DevTools 停用 JS 或直接讀原始碼的人不構成真正的存取控制——跟全站其他頁面的權限模型一致（見上方 RLS 摘要：真正的防線在資料庫，前端守衛只防一般誤觸）。

## 已知技術債 / 未完成

1. **Tailwind Play CDN 不適合正式上線**（每次載入即時編譯、體積大）。上線前應改為 Tailwind CLI 預編譯 CSS。三份 HTML 的 `tailwind.config` 重複，需同步修改。
2. **答案對錯判定在前端**：`record_answer` 相信前端傳來的 `p_correct`。學生理論上可打開 DevTools 作弊。要嚴格防範需把「出題+判題」都搬進 DB 函式或 Edge Function。
3. **無法刪除學生／重設密碼**：需要 Supabase service_role key（不能放前端）。目前只能在 Supabase Dashboard → Authentication 手動操作。
4. **老師只有一位的假設**：`is_teacher()` 允許任何老師管理所有資料；第一個註冊帳號成為老師的 bootstrap 機制，若被搶註需去 DB 手動改 `profiles.role`。
5. **練習資料全量載入**：學生端把被指派的所有單字/進度一次抓回前端計算佇列。單字數千級以上需改成 DB 端查詢（view 或 RPC）。
6. **每題作答都打一次 `record_answer`**：離線或網路差時會掉進度（有 toast 提示但不重試）。可加本地佇列重送。
7. **無單元測試、無 CI。**
8. **發音品質依裝置而異**（Web Speech API）；未來可擴充老師上傳音檔，播放時優先音檔、fallback TTS。
9. **帳號建立順序陷阱（已遇過一次）**：在 `schema.sql` 執行「之前」註冊的帳號不會有 `handle_new_user` trigger 建的 profile 列，登入後會被登出彈回登入頁（登入頁現在會顯示明確錯誤訊息）。修復方式：SQL Editor 執行 `repair-profiles.sql`。資料庫裡可能存在診斷用測試帳號 `ctest01@vocab.local` / `ctest02@vocab.local`（密碼 test123456），可在 Authentication → Users 刪除。
10. **靜態檔案是「一整組」，不能只上傳一部分**：三個頁面的 `<script src>` 有嚴格依賴順序（Supabase SDK → `config.js` → `common.js` → 頁面自己的 js），任一個檔案沒同步部署（沒上傳、被覆蓋成舊版、或主機有大小寫敏感問題導致路徑對不上）都會讓 `sb`（Supabase client）沒定義成功，並在使用者點擊登入等操作時丟出 `ReferenceError: sb is not defined`，UI 卡在「處理中」不會恢復。已加防呆：三頁的 `common.js` 之後都插了一段 inline script，偵測 `typeof sb === 'undefined'` 時直接把整個畫面換成「網站資源載入失敗，請重新整理／檢查部署」的提示，不會再讓使用者卡在無反應的按鈕上、只能到 Console 找線索。**改動 `public/` 任何檔案後，務必整個資料夾一起重新部署**，不要單獨替換某個檔案；懷疑是快取問題時先 Ctrl+Shift+R 或無痕視窗排除。

## 擴充功能建議切入點

- **新題型**（例如聽音選字、例句填空）：`student.js` 的 `renderQuestion()` 內以 `qtype` 分支；加題型時同步調整 `record_answer` 的 XP 規則（`p_qtype`）。
- **徽章系統**：加 `badges` + `student_badges` 表；在 `record_answer` 回傳值判斷達成條件（連續天數、熟記數里程碑），前端在 `answer()` 收到後彈窗。
- **排行榜**：`profiles` 已有 xp/streak，加一個老師端視圖即可；注意 RLS 目前學生看不到彼此的 profile，需要新 policy 或 security definer view。
- **老師多人/班級制**：`word_sets.teacher_id` 已存在；把 `is_teacher()` 的全域權限改成 per-teacher 過濾，加 `teacher_students` 關聯表。
- **匯出報表**：老師端 `studentStats()` 已算好所有數據，加 CSV 下載即可。
- **PWA 離線**：加 manifest + service worker，練習佇列先寫 IndexedDB 再同步。
