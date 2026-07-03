-- ============================================================
-- 儀表板統計驗證用測試資料
-- 用途：建立一個單字集 + 指派給 dashtest01@vocab.local（測試學生）
--       之後會透過 record_answer（跟正式練習走同一支函式）產生
--       「已熟記／待複習／錯題本」三種狀態，驗證儀表板數字正確
-- 使用方式：Supabase Dashboard → SQL Editor 貼上執行
-- 驗證完畢後，執行本檔最下方的清理區塊即可全部移除
-- ============================================================

do $$
declare
  v_teacher_id uuid;
  v_student_id uuid;
  v_set_id     bigint;
begin
  select id into v_teacher_id from public.profiles where role = 'teacher' limit 1;
  select id into v_student_id from public.profiles where username = 'dashtest01';

  if v_teacher_id is null then
    raise exception '找不到任何老師帳號，請先確認至少有一位 teacher';
  end if;
  if v_student_id is null then
    raise exception '找不到 dashtest01，請先透過網站或 API 建立這個測試學生帳號';
  end if;

  insert into public.word_sets (teacher_id, name, category, difficulty)
  values (v_teacher_id, '🧪 儀表板測試（可刪除）', '測試', '初級')
  returning id into v_set_id;

  insert into public.words (set_id, english, chinese) values
    (v_set_id, 'mastered1', '已熟記一'),
    (v_set_id, 'mastered2', '已熟記二'),
    (v_set_id, 'due1',      '待複習一'),
    (v_set_id, 'due2',      '待複習二'),
    (v_set_id, 'wrong1',    '錯題一'),
    (v_set_id, 'wrong2',    '錯題二'),
    (v_set_id, 'fresh1',    '全新一'),
    (v_set_id, 'fresh2',    '全新二');

  insert into public.assignments (set_id, student_id) values (v_set_id, v_student_id);

  raise notice '測試單字集 id = %，已指派給 dashtest01', v_set_id;
end $$;

-- 執行後可用這行找出剛建立的 word_id，等一下要用來呼叫 record_answer
select w.id, w.english, w.chinese
from public.words w
join public.word_sets ws on ws.id = w.set_id
where ws.name = '🧪 儀表板測試（可刪除）'
order by w.id;

-- ============================================================
-- 驗證完畢後的清理（word_sets 用 cascade，words/assignments/progress 會一起刪）
-- ============================================================
-- delete from public.word_sets where name = '🧪 儀表板測試（可刪除）';
-- delete from auth.users where email = 'dashtest01@vocab.local';
