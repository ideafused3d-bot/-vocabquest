-- ============================================================
-- 清理腳本：刪除沒有 profile、從未成功登入過的 teacher001 帳號
-- 保留 teacher002 作為正式老師帳號
-- 使用方式：Supabase Dashboard → SQL Editor 貼上執行
-- ============================================================

-- 步驟 1：執行前再次確認 teacher001 沒有任何關聯資料（應該回傳 0 筆）
select 'word_sets owned' as check_type, count(*) as cnt
from public.word_sets ws
join auth.users u on u.id = ws.teacher_id
where u.email = 'teacher001@vocab.local'
union all
select 'assignments as student', count(*)
from public.assignments a
join auth.users u on u.id = a.student_id
where u.email = 'teacher001@vocab.local';

-- 若上面兩個 cnt 都是 0（預期如此，因為它從未成功登入過），才繼續執行下方刪除

-- 步驟 2：刪除 teacher001（auth.users 刪除會自動連動刪除 profiles，因為有 on delete cascade）
delete from auth.users where email = 'teacher001@vocab.local';

-- 步驟 3：確認乾淨了 —— 應該只剩 test001（student）和 teacher002（teacher）
select u.email, p.role, p.username
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;
