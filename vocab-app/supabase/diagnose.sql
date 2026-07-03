-- ============================================================
-- 診斷腳本：登入問題一次看清楚
-- 使用方式：Supabase Dashboard → SQL Editor 貼上執行
-- 把結果貼給協助你的人（或 AI）即可判斷問題
-- ============================================================

-- 所有帳號總覽：有沒有 profile、角色是什麼、最後登入時間
select
  u.email                                   as "登入帳號",
  coalesce(p.username, '(無)')              as "username",
  coalesce(p.role, '❌ 缺 profile')          as "角色",
  coalesce(p.display_name, '-')             as "顯示名稱",
  u.created_at::date                        as "建立日期",
  coalesce(u.last_sign_in_at::text, '從未登入') as "最後登入"
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- ============================================================
-- 常用修復（依診斷結果選用，把 -- 拿掉再執行）
-- ============================================================

-- A. 有帳號缺 profile → 執行 repair-profiles.sql

-- B. 老師帳號忘記密碼／被誤刪 → 到網站「建立老師帳號」分頁註冊一個
--    新帳號（會自動成為 student），然後執行這行把它升級成老師：
-- update public.profiles set role = 'teacher' where username = '新帳號名';

-- C. 某個帳號角色錯了（該是學生卻變老師、或相反）：
-- update public.profiles set role = 'student' where username = '帳號名';

-- D. 刪除測試帳號（ctest01 / ctest02 是健康檢查用的，可刪）：
--    請到 Dashboard → Authentication → Users 刪除（profile 會自動跟著刪）
