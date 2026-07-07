# SPEC — VocabQuest 專案規格

> 內容遷移自舊 CLAUDE.md（2026-07-07，對照見 MIGRATION-LOG.md）。FREE：功能變動後應同步更新本檔。

## 專案是什麼

**VocabQuest** — 家教老師用的單字練習平台。一位老師管理多位學生，老師自建單字集並指派給學生；學生用 SRS（間隔重複）練習單字、累積 XP 與連續天數。

⚠️ 專案根目錄的 `index.html` 是**另一個獨立的舊任務**（SaaS landing page 示範），與 VocabQuest 無關，不要混在一起改。VocabQuest 全部在 `vocab-app/` 內。

## 資料夾結構

```
test-project/                   # git repo 根目錄（GitHub: ideafused3d-bot/-vocabquest）
├── .github/workflows/
│   └── deploy-pages.yml        # push 到 master 時自動把 vocab-app/public 發布到 GitHub Pages
├── index.html                  # （無關）舊的 SaaS landing page 示範
├── CLAUDE.md                   # 路由中心（≤120 行）
├── docs/                       # harness（通用層）與 project（專案層）文件
└── vocab-app/
    ├── supabase/
    │   ├── schema.sql          # 完整 DB schema + RLS + SRS 函式，貼到 Supabase SQL Editor 執行一次
    │   ├── repair-profiles.sql # 修復腳本：為 schema 執行「前」建立的帳號補建 profiles
    │   └── diagnose.sql        # 診斷腳本：列出所有帳號狀態 + 常用修復 SQL（老師救援等）
    └── public/                 # 純靜態前端，可部署到任何靜態空間
        ├── index.html          # 登入頁（含「首次建立老師帳號」分頁）
        ├── guide.html          # 使用手冊（僅老師登入後可見，見「guide.html 存取限制」）
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

設計 token（各 HTML 的 tailwind.config 中，**三處重複，改時要同步**）：
主色 `#EA580C` 珊瑚橘、輔色 `#F59E0B`、成功 `#16A34A`、學習中 `#4F46E5`、背景 `#FFF7ED`。

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
- **XP**：選擇題答對 +10、拼字答對 +15、答錯 +2（安慰分）。等級：升到下一級需 `目前等級×100` XP（累進），見 `levelInfo()`。
- **連續天數**：以台北時區日期計（DB 端 `Asia/Taipei`）。昨天有練 +1、今天已練不變、中斷歸 1。
- **練習佇列**：每輪上限 20 題（`SESSION_LIMIT`）。每日複習＝到期單字＋新單字；題型按奇偶題號輪替（偶＝選擇、奇＝拼字）。選擇題干擾項從學生被指派的所有單字抽 3 個，不足用 `FALLBACK_CHOICES` 墊。
- **帳號**：內部 email 一律 `<username>@vocab.local`（`toEmail()`）。老師新增學生用獨立的 `sbSignup` client（`persistSession:false`），避免 signUp 蓋掉老師 session。

### 儀表板三項統計指標定義（2026-07-04 確認）

計算邏輯集中在 `common.js` 的 `wordStatus()` / `isWrongBookWord()` 和 `student.js` 的 `stats()`：

| 指標 | 定義 | 說明 |
|---|---|---|
| 已熟記單字 | `box >= 5`（`MASTERED_BOX`） | SRS 間隔已拉長到 15 天以上；約等於「從頭連續答對 5 次且中途沒有大量答錯」。 |
| 待複習單字 | 該單字**已有** `word_progress` 紀錄，且 `next_review_at <= 現在` | 只算「已經練過、排程到期的舊單字」，**不含從未練習過的新單字**（新單字算「未學習」，走另一個計數）；跟 Anki 等主流 SRS 軟體口徑一致。 |
| 錯題本單字 | `wrong_count >= 2` 且 `box < 5`（尚未熟記） | 答錯滿 2 次即收錄；後來練到熟記（box≥5）會自動移出錯題本。 |

這三個指標只取決於 `word_progress` 表的資料，**若學生帳號從未練習過任何單字，三項數字合理地全部顯示為 0**（不是 bug）。已用 `common.js`/`student.js` 的實際函式（Node vm 模組載入真實原始碼，非重寫邏輯）餵合成測試資料驗證過，8 種狀態組合全部計算正確。

## 已實作功能

**學生端**：儀表板（連續天數/已熟記/待複習/錯題數 + 等級進度條）、每日複習、單字集練習、錯題複習、兩種題型輪替（四選一選擇題、拼字填空+TTS 發音）、即時對錯回饋與答對統計、confetti 與升級動畫、進度總覽（三狀態比例 + 各單字集分解）、錯題本列表。

**老師端**：總覽（學生數/單字集數/總單字數/全體已熟記 + 近期活躍）、學生列表（streak/Lv/熟記數）、學生詳情（三狀態比例、被指派單字集進度、常錯 Top 10）、新增學生帳號、單字集 CRUD（名稱/分類/難度 + 單字逐列編輯 + 批次貼上「英文,中文」）、指派/取消指派學生、一鍵匯入示範資料、刪除單字集（confirm 保護）。

**共用**：帳密登入、角色導向（登入後自動進對應頁面）、RWD（手機底部導覽）、`prefers-reduced-motion` 支援、登入頁下方隱私告知文字（小字、非彈窗，告知會記錄學習資料、僅本人與老師可見）。

### 使用手冊（`guide.html`）存取限制（2026-07-06）

`guide.html` 只給老師用，學生不該看到入口也不該能直接開網址進去：

- **入口**：登入頁的「📖 使用手冊」連結已移除；改放在 `teacher.html` 頂部列（`logout()` 按鈕旁）。學生端完全沒有入口。
- **直接輸入網址的防護**：`guide.html` 預設 `<body style="visibility:hidden">`，載入 Supabase SDK / `config.js` / `common.js` 後呼叫 `requireUser('teacher')`（與 teacher/student 頁同一套守衛）——未登入導回 `index.html`、學生身分導回 `student.html`，只有老師會把 `visibility` 改回 `visible`。
- **注意**：只擋一般使用者照網址開頁。`guide.html` 是靜態檔，內容仍會下載到瀏覽器（JS 執行前用 CSS 藏住），擋不住開 DevTools 的人——與全站權限模型一致（真正防線在 DB 的 RLS，前端守衛只防誤觸）。

## 擴充功能建議切入點

- **新題型**（聽音選字、例句填空）：`student.js` 的 `renderQuestion()` 內以 `qtype` 分支；加題型時同步調整 `record_answer` 的 XP 規則（`p_qtype`）。
- **徽章系統**：加 `badges` + `student_badges` 表；在 `record_answer` 回傳值判斷達成條件，前端在 `answer()` 收到後彈窗。
- **排行榜**：`profiles` 已有 xp/streak，加老師端視圖即可；注意 RLS 目前學生看不到彼此 profile，需新 policy 或 security definer view。
- **老師多人/班級制**：`word_sets.teacher_id` 已存在；把 `is_teacher()` 的全域權限改成 per-teacher 過濾，加 `teacher_students` 關聯表。
- **匯出報表**：老師端 `studentStats()` 已算好所有數據，加 CSV 下載即可。
- **PWA 離線**：加 manifest + service worker，練習佇列先寫 IndexedDB 再同步。
