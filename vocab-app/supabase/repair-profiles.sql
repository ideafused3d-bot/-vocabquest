-- ============================================================
-- 修復腳本：為「schema.sql 執行前就建立的帳號」補建 profiles
-- 使用方式：Supabase Dashboard → SQL Editor 貼上執行
-- ============================================================

-- 步驟 1：先看哪些帳號缺 profile（確認問題）
select u.email,
       u.created_at,
       case when p.id is null then '❌ 缺 profile' else '✅ 正常' end as status
from auth.users u
left join public.profiles p on p.id = u.id
order by u.created_at;

-- 步驟 2：補建缺少的 profiles
-- （有 role 中繼資料者用之；否則已有老師時一律補為 student）
insert into public.profiles (id, role, username, display_name)
select u.id,
       coalesce(
         u.raw_user_meta_data ->> 'role',
         case when exists (select 1 from public.profiles where role = 'teacher')
              then 'student' else 'teacher' end
       ),
       coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1)),
       coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
order by u.created_at;

-- 步驟 3：再跑一次步驟 1 確認全部「✅ 正常」

-- （備用）如果老師自己的帳號被誤補成 student，手動改回來：
-- update public.profiles set role = 'teacher' where username = '你的老師帳號名';
