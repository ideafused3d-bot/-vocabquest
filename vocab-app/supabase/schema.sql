-- ============================================================
-- 單字練習平台 (Vocab Tutor) — Supabase Schema
-- 使用方式：在 Supabase Dashboard → SQL Editor 貼上全文執行一次
-- 前置設定：Authentication → Sign In / Up → Email →
--           關閉「Confirm email」（學生帳號用虛擬 email，無法收信）
-- ============================================================

-- ---------- 資料表 ----------

create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  role             text not null default 'student' check (role in ('teacher', 'student')),
  username         text not null unique,
  display_name     text not null,
  xp               integer not null default 0,
  streak_days      integer not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

create table public.word_sets (
  id         bigint generated always as identity primary key,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  category   text not null default '',
  difficulty text not null default '初級' check (difficulty in ('初級', '中級', '高級')),
  created_at timestamptz not null default now()
);

create table public.words (
  id         bigint generated always as identity primary key,
  set_id     bigint not null references public.word_sets(id) on delete cascade,
  english    text not null,
  chinese    text not null,
  created_at timestamptz not null default now()
);

create table public.assignments (
  id          bigint generated always as identity primary key,
  set_id      bigint not null references public.word_sets(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (set_id, student_id)
);

-- SRS 進度：box 0-6，間隔天數 [0,1,2,4,7,15,30]，box >= 5 視為「已熟記」
create table public.word_progress (
  id               bigint generated always as identity primary key,
  student_id       uuid not null references public.profiles(id) on delete cascade,
  word_id          bigint not null references public.words(id) on delete cascade,
  box              integer not null default 0,
  next_review_at   timestamptz not null default now(),
  correct_count    integer not null default 0,
  wrong_count      integer not null default 0,
  last_reviewed_at timestamptz,
  unique (student_id, word_id)
);

create index idx_words_set          on public.words (set_id);
create index idx_assignments_student on public.assignments (student_id);
create index idx_progress_student    on public.word_progress (student_id);
create index idx_progress_review     on public.word_progress (student_id, next_review_at);

-- ---------- 輔助函式 ----------

-- security definer：繞過 RLS 判斷目前登入者是否為老師（避免 policy 遞迴）
create or replace function public.is_teacher()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'teacher');
$$;

-- 新用戶註冊時自動建立 profile；「第一個註冊的帳號自動成為老師」
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, username, display_name)
  values (
    new.id,
    case when exists (select 1 from public.profiles) then 'student' else 'teacher' end,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- SRS 核心：作答記錄（在 DB 端計算，前端無法竄改 XP） ----------
-- 規則：答對 box+1（上限 6）、答錯 box-2（下限 0）
--       下次複習 = now + 間隔[box]；選擇題答對 +10 XP、拼字答對 +15、答錯 +2
--       連續天數：以台北時區日期計，昨天有練 +1、今天已練不變、中斷歸 1
create or replace function public.record_answer(
  p_word_id bigint,
  p_correct boolean,
  p_qtype   text default 'choice'
)
returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_intervals int[] := array[0, 1, 2, 4, 7, 15, 30];
  v_box       int;
  v_prog_id   bigint;
  v_today     date := (now() at time zone 'Asia/Taipei')::date;
  v_gain      int;
  v_xp        int;
  v_streak    int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- 只能作答被指派的單字
  if not exists (
    select 1 from words w
    join assignments a on a.set_id = w.set_id
    where w.id = p_word_id and a.student_id = v_uid
  ) then
    raise exception 'word not assigned to this student';
  end if;

  insert into word_progress (student_id, word_id)
  values (v_uid, p_word_id)
  on conflict (student_id, word_id) do nothing;

  select id, box into v_prog_id, v_box
  from word_progress
  where student_id = v_uid and word_id = p_word_id
  for update;

  if p_correct then
    v_box := least(v_box + 1, 6);
  else
    v_box := greatest(v_box - 2, 0);
  end if;

  update word_progress set
    box              = v_box,
    correct_count    = correct_count + (case when p_correct then 1 else 0 end),
    wrong_count      = wrong_count   + (case when p_correct then 0 else 1 end),
    last_reviewed_at = now(),
    next_review_at   = now() + make_interval(days => v_intervals[v_box + 1])
  where id = v_prog_id;

  v_gain := case
    when not p_correct then 2
    when p_qtype = 'spell' then 15
    else 10
  end;

  update profiles set
    xp = xp + v_gain,
    streak_days = case
      when last_active_date = v_today then streak_days
      when last_active_date = v_today - 1 then streak_days + 1
      else 1
    end,
    last_active_date = v_today
  where id = v_uid
  returning xp, streak_days into v_xp, v_streak;

  return json_build_object(
    'xp', v_xp,
    'streak_days', v_streak,
    'box', v_box,
    'mastered', v_box >= 5,
    'gained', v_gain
  );
end;
$$;

grant execute on function public.record_answer(bigint, boolean, text) to authenticated;

-- ---------- Row Level Security ----------

alter table public.profiles      enable row level security;
alter table public.word_sets     enable row level security;
alter table public.words         enable row level security;
alter table public.assignments   enable row level security;
alter table public.word_progress enable row level security;

-- profiles：自己或老師可讀；寫入一律由 trigger / record_answer（security definer）處理
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_teacher());

-- word_sets：老師全權；學生可讀被指派的單字集
create policy "sets_select" on public.word_sets
  for select using (
    public.is_teacher()
    or exists (select 1 from assignments a where a.set_id = id and a.student_id = auth.uid())
  );
create policy "sets_insert" on public.word_sets
  for insert with check (public.is_teacher() and teacher_id = auth.uid());
create policy "sets_update" on public.word_sets
  for update using (public.is_teacher());
create policy "sets_delete" on public.word_sets
  for delete using (public.is_teacher());

-- words：老師全權；學生可讀被指派單字集內的單字
create policy "words_select" on public.words
  for select using (
    public.is_teacher()
    or exists (select 1 from assignments a where a.set_id = words.set_id and a.student_id = auth.uid())
  );
create policy "words_insert" on public.words
  for insert with check (public.is_teacher());
create policy "words_update" on public.words
  for update using (public.is_teacher());
create policy "words_delete" on public.words
  for delete using (public.is_teacher());

-- assignments：老師全權；學生可讀自己的指派
create policy "assignments_select" on public.assignments
  for select using (student_id = auth.uid() or public.is_teacher());
create policy "assignments_insert" on public.assignments
  for insert with check (public.is_teacher());
create policy "assignments_delete" on public.assignments
  for delete using (public.is_teacher());

-- word_progress：學生讀自己的、老師讀全部；寫入僅透過 record_answer
create policy "progress_select" on public.word_progress
  for select using (student_id = auth.uid() or public.is_teacher());
