// ============================================================
// 學生端：儀表板 / SRS 練習 / 進度總覽 / 錯題本
// ============================================================

let me = null;            // 目前登入的學生 profile
let sets = [];            // 被指派的單字集
let words = [];           // 所有被指派的單字（扁平）
let progressMap = new Map(); // word_id -> word_progress

// 單字池不足 4 個時，用這些墊選擇題選項
const FALLBACK_CHOICES = ['apple', 'window', 'happy', 'travel', 'dream', 'ocean'];

const SESSION_LIMIT = 20; // 每輪練習最多題數

// ---------- 資料載入 ----------

async function loadData() {
  const { data: assigns } = await sb
    .from('assignments')
    .select('set_id, word_sets(id, name, category, difficulty)')
    .eq('student_id', me.id);
  sets = (assigns || []).map((a) => a.word_sets).filter(Boolean);

  const setIds = sets.map((s) => s.id);
  if (setIds.length) {
    const { data: ws } = await sb.from('words').select('*').in('set_id', setIds);
    words = ws || [];
  } else {
    words = [];
  }

  const { data: prog } = await sb.from('word_progress').select('*').eq('student_id', me.id);
  progressMap = new Map((prog || []).map((p) => [p.word_id, p]));
}

function stats() {
  const now = new Date();
  let mastered = 0, learning = 0, fresh = 0, due = 0;
  for (const w of words) {
    const p = progressMap.get(w.id);
    const st = wordStatus(p);
    if (st === 'mastered') mastered++;
    else if (st === 'learning') learning++;
    else fresh++;
    if (p && new Date(p.next_review_at) <= now) due++;
  }
  return { mastered, learning, fresh, due, total: words.length };
}

function wrongbookWords() {
  return words.filter((w) => isWrongBookWord(progressMap.get(w.id)));
}

// ---------- 視圖切換 ----------

const VIEWS = ['dashboard', 'practice', 'progress', 'wrongbook'];

function showView(name) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== name);
  }
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    const active = btn.dataset.nav === name;
    btn.classList.toggle('text-primary', active);
    btn.classList.toggle('text-slate-400', !active);
  });
  document.getElementById('bottom-nav').classList.toggle('hidden', name === 'practice');
  window.scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    await loadData(); // 回到列表頁時刷新進度
    renderAll();
    showView(btn.dataset.nav);
  });
});

// ---------- 儀表板 ----------

function renderDashboard() {
  const s = stats();
  const lv = levelInfo(me.xp);
  const wrongCount = wrongbookWords().length;

  const setCards = sets.map((set) => {
    const setWords = words.filter((w) => w.set_id === set.id);
    const done = setWords.filter((w) => wordStatus(progressMap.get(w.id)) === 'mastered').length;
    const pct = setWords.length ? Math.round((done / setWords.length) * 100) : 0;
    const diffColor = { '初級': 'bg-green-100 text-green-700', '中級': 'bg-amber-100 text-amber-700', '高級': 'bg-red-100 text-red-700' }[set.difficulty] || 'bg-slate-100 text-slate-600';
    return `
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate font-bold text-slate-900">${escapeHtml(set.name)}</p>
            <p class="mt-0.5 text-xs text-slate-500">${escapeHtml(set.category)}
              <span class="ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${diffColor}">${escapeHtml(set.difficulty)}</span>
            </p>
          </div>
          <button data-practice-set="${set.id}"
            class="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-95">
            練習
          </button>
        </div>
        <div class="mt-3 flex items-center gap-2">
          <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-orange-100">
            <div class="h-full rounded-full bg-okay transition-all" style="width:${pct}%"></div>
          </div>
          <span class="text-xs font-bold text-slate-500">${done}/${setWords.length}</span>
        </div>
      </div>`;
  }).join('');

  document.getElementById('view-dashboard').innerHTML = `
    <div>
      <h1 class="font-display text-2xl font-semibold text-slate-900">嗨，${escapeHtml(me.display_name)}！👋</h1>
      <p class="mt-1 text-sm text-slate-500">今天也一起累積單字力吧</p>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <p class="text-2xl">🔥</p>
        <p class="mt-1 font-display text-2xl font-semibold text-slate-900">${me.streak_days}</p>
        <p class="text-xs font-bold text-slate-500">連續學習天數</p>
      </div>
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <p class="text-2xl">✅</p>
        <p class="mt-1 font-display text-2xl font-semibold text-slate-900">${s.mastered}</p>
        <p class="text-xs font-bold text-slate-500">已熟記單字</p>
      </div>
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <p class="text-2xl">⏰</p>
        <p class="mt-1 font-display text-2xl font-semibold text-slate-900">${s.due}</p>
        <p class="text-xs font-bold text-slate-500">待複習單字</p>
      </div>
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <p class="text-2xl">📕</p>
        <p class="mt-1 font-display text-2xl font-semibold text-slate-900">${wrongCount}</p>
        <p class="text-xs font-bold text-slate-500">錯題本單字</p>
      </div>
    </div>

    <!-- 等級進度 -->
    <div class="rounded-xl2 bg-gradient-to-br from-primary to-amber2 p-5 text-white shadow-card">
      <div class="flex items-center justify-between">
        <p class="font-display text-xl font-semibold">⭐ Lv.${lv.level}</p>
        <p class="text-sm font-bold text-white/90">${lv.into} / ${lv.need} XP</p>
      </div>
      <div class="mt-3 h-3 overflow-hidden rounded-full bg-white/25">
        <div class="h-full rounded-full bg-white transition-all" style="width:${lv.pct}%"></div>
      </div>
      <p class="mt-2 text-xs text-white/80">再 ${lv.need - lv.into} XP 升級！</p>
    </div>

    <!-- 快速開始 -->
    <div class="grid gap-3 sm:grid-cols-2">
      <button id="btn-daily" ${s.due + s.fresh === 0 ? 'disabled' : ''}
        class="flex items-center justify-between rounded-xl2 bg-primary p-5 text-left text-white shadow-card transition hover:bg-primary-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
        <div>
          <p class="font-display text-lg font-semibold">📅 每日複習</p>
          <p class="mt-0.5 text-sm text-white/85">${s.due} 個到期 + 新單字</p>
        </div>
        <span class="text-2xl" aria-hidden="true">→</span>
      </button>
      <button id="btn-wrong" ${wrongCount === 0 ? 'disabled' : ''}
        class="flex items-center justify-between rounded-xl2 bg-learn p-5 text-left text-white shadow-card transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">
        <div>
          <p class="font-display text-lg font-semibold">📕 錯題複習</p>
          <p class="mt-0.5 text-sm text-white/85">${wrongCount} 個常錯單字</p>
        </div>
        <span class="text-2xl" aria-hidden="true">→</span>
      </button>
    </div>

    <div>
      <h2 class="mb-3 font-display text-lg font-semibold text-slate-900">我的單字集</h2>
      <div class="space-y-3">
        ${setCards || `<div class="rounded-xl2 bg-white p-8 text-center shadow-card">
          <p class="text-3xl">📭</p>
          <p class="mt-2 font-bold text-slate-600">還沒有被指派單字集</p>
          <p class="mt-1 text-sm text-slate-400">請老師幫你指派單字集之後再回來吧！</p>
        </div>`}
      </div>
    </div>`;

  document.getElementById('btn-daily')?.addEventListener('click', () => startPractice('daily'));
  document.getElementById('btn-wrong')?.addEventListener('click', () => startPractice('wrong'));
  document.querySelectorAll('[data-practice-set]').forEach((btn) =>
    btn.addEventListener('click', () => startPractice('set', Number(btn.dataset.practiceSet)))
  );
}

// ---------- 練習佇列 ----------

function buildQueue(mode, setId) {
  const now = new Date();
  const isDue = (w) => {
    const p = progressMap.get(w.id);
    return p && new Date(p.next_review_at) <= now;
  };
  const isNew = (w) => wordStatus(progressMap.get(w.id)) === 'new';

  let queue = [];
  if (mode === 'daily') {
    const due = shuffle(words.filter(isDue));
    const fresh = shuffle(words.filter(isNew));
    queue = [...due, ...fresh];
  } else if (mode === 'wrong') {
    queue = shuffle(wrongbookWords());
  } else if (mode === 'set') {
    const inSet = words.filter((w) => w.set_id === setId);
    queue = [...shuffle(inSet.filter(isDue)), ...shuffle(inSet.filter(isNew)),
             ...shuffle(inSet.filter((w) => !isDue(w) && !isNew(w)))];
  }
  return queue.slice(0, SESSION_LIMIT);
}

function makeChoices(word) {
  const pool = [...new Set(words.filter((w) => w.english !== word.english).map((w) => w.english))];
  const distractors = shuffle(pool).slice(0, 3);
  while (distractors.length < 3) {
    const pad = FALLBACK_CHOICES.find((c) => c !== word.english && !distractors.includes(c));
    if (!pad) break;
    distractors.push(pad);
  }
  return shuffle([word.english, ...distractors]);
}

// ---------- 練習流程 ----------

let session = null;

function startPractice(mode, setId) {
  const queue = buildQueue(mode, setId);
  if (!queue.length) {
    toast('目前沒有可以練習的單字！', 'info');
    return;
  }
  session = { queue, idx: 0, correct: 0, answered: 0, mode };
  showView('practice');
  renderQuestion();
}

function renderQuestion() {
  const { queue, idx } = session;
  const word = queue[idx];
  const qtype = idx % 2 === 0 ? 'choice' : 'spell'; // 兩種題型輪替
  const pct = Math.round((idx / queue.length) * 100);

  const header = `
    <div class="flex items-center gap-3">
      <button id="btn-quit" class="rounded-lg px-2 py-1 text-sm font-bold text-slate-400 hover:text-slate-700" aria-label="結束練習">✕</button>
      <div class="h-3 flex-1 overflow-hidden rounded-full bg-orange-100">
        <div class="h-full rounded-full bg-primary transition-all" style="width:${pct}%"></div>
      </div>
      <span class="text-sm font-bold text-slate-500">${idx + 1}/${queue.length}</span>
    </div>
    <p class="mt-2 text-right text-xs font-bold text-slate-400">答對 ${session.correct} / ${session.answered}</p>`;

  let body = '';
  if (qtype === 'choice') {
    const choices = makeChoices(word);
    body = `
      <div class="anim-pop mt-6 rounded-xl2 bg-white p-6 text-center shadow-card">
        <p class="text-xs font-bold uppercase tracking-wide text-primary">選出正確的英文</p>
        <p class="mt-4 font-display text-4xl font-semibold text-slate-900">${escapeHtml(word.chinese)}</p>
      </div>
      <div class="mt-5 grid gap-3">
        ${choices.map((c) => `
          <button data-choice="${escapeHtml(c)}"
            class="choice-btn rounded-xl2 border-2 border-orange-100 bg-white px-5 py-4 text-left font-display text-xl font-medium text-slate-800 shadow-sm transition hover:border-primary-light active:scale-[0.99]">
            ${escapeHtml(c)}
          </button>`).join('')}
      </div>`;
  } else {
    body = `
      <div class="anim-pop mt-6 rounded-xl2 bg-white p-6 text-center shadow-card">
        <p class="text-xs font-bold uppercase tracking-wide text-learn">拼出英文單字</p>
        <p class="mt-4 font-display text-4xl font-semibold text-slate-900">${escapeHtml(word.chinese)}</p>
        <button id="btn-speak" class="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-learn/10 text-learn transition hover:bg-learn/20 active:scale-95" aria-label="播放發音">
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <form id="spell-form" class="mt-5">
        <input id="spell-input" type="text" autocomplete="off" autocapitalize="none" spellcheck="false"
          class="w-full rounded-xl2 border-2 border-orange-100 bg-white px-5 py-4 text-center font-display text-2xl outline-none transition focus:border-learn"
          placeholder="輸入英文拼字" />
        <button type="submit"
          class="mt-3 w-full rounded-xl2 bg-learn py-3.5 font-display text-lg font-semibold text-white transition hover:brightness-110 active:scale-[0.99]">
          送出答案
        </button>
      </form>`;
  }

  document.getElementById('view-practice').innerHTML =
    `${header}${body}<div id="feedback-area" class="mt-5"></div>`;

  document.getElementById('btn-quit').addEventListener('click', endPractice);

  if (qtype === 'choice') {
    document.querySelectorAll('.choice-btn').forEach((btn) =>
      btn.addEventListener('click', () => answer(word, btn.dataset.choice === word.english, 'choice', btn))
    );
  } else {
    document.getElementById('btn-speak').addEventListener('click', () => speak(word.english));
    speak(word.english); // 進題時自動播一次
    const input = document.getElementById('spell-input');
    input.focus();
    document.getElementById('spell-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value.trim().toLowerCase();
      if (!val) return;
      answer(word, val === word.english.trim().toLowerCase(), 'spell');
    });
  }
}

async function answer(word, correct, qtype, clickedBtn) {
  session.answered++;
  if (correct) session.correct++;

  // 鎖定作答區
  document.querySelectorAll('.choice-btn').forEach((b) => {
    b.disabled = true;
    if (b.dataset.choice === word.english) {
      b.classList.add('!border-okay', '!bg-green-50');
    } else if (b === clickedBtn) {
      b.classList.add('!border-red-400', '!bg-red-50', 'anim-shake');
    } else {
      b.classList.add('opacity-50');
    }
  });
  const spellInput = document.getElementById('spell-input');
  if (spellInput) {
    spellInput.disabled = true;
    spellInput.classList.add(correct ? '!border-okay' : '!border-red-400');
    if (!correct) spellInput.classList.add('anim-shake');
    document.querySelector('#spell-form button').disabled = true;
  }

  // 回饋列
  const fb = document.getElementById('feedback-area');
  fb.innerHTML = `
    <div class="anim-pop rounded-xl2 p-4 ${correct ? 'bg-green-50' : 'bg-red-50'}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="font-display text-lg font-semibold ${correct ? 'text-okay' : 'text-red-600'}">
            ${correct ? '🎉 答對了！' : '💪 再接再厲'}
          </p>
          <p class="mt-0.5 text-sm text-slate-600">
            ${escapeHtml(word.english)} — ${escapeHtml(word.chinese)}
            <button id="fb-speak" class="ml-1 align-middle text-learn" aria-label="播放發音">🔊</button>
          </p>
        </div>
        <button id="btn-next"
          class="shrink-0 rounded-xl px-5 py-3 font-display font-semibold text-white transition active:scale-95 ${correct ? 'bg-okay hover:brightness-110' : 'bg-red-500 hover:brightness-110'}">
          ${session.idx + 1 >= session.queue.length ? '看結果' : '下一題 →'}
        </button>
      </div>
      <p id="xp-gain" class="mt-2 hidden text-xs font-bold text-amber-600"></p>
    </div>`;
  document.getElementById('fb-speak').addEventListener('click', () => speak(word.english));
  const nextBtn = document.getElementById('btn-next');
  nextBtn.focus();
  nextBtn.addEventListener('click', () => {
    session.idx++;
    if (session.idx >= session.queue.length) renderSummary();
    else renderQuestion();
  });

  if (correct && qtype === 'choice') confetti({ particleCount: 40, spread: 55, origin: { y: 0.75 } });
  if (correct && qtype === 'spell') confetti({ particleCount: 70, spread: 70, origin: { y: 0.75 } });

  // 寫回資料庫（DB 端計算 SRS + XP）
  const prevLevel = levelInfo(me.xp).level;
  const { data, error } = await sb.rpc('record_answer', {
    p_word_id: word.id, p_correct: correct, p_qtype: qtype,
  });
  if (error) {
    toast('進度儲存失敗，請檢查網路', 'error');
    return;
  }
  me.xp = data.xp;
  me.streak_days = data.streak_days;
  const gainEl = document.getElementById('xp-gain');
  if (gainEl) {
    gainEl.textContent = `+${data.gained} XP${data.mastered ? '　⭐ 這個單字已熟記！' : ''}`;
    gainEl.classList.remove('hidden');
  }
  const newLevel = levelInfo(me.xp).level;
  if (newLevel > prevLevel) {
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 } });
    toast(`🎊 升級！現在是 Lv.${newLevel}`, 'success');
  }
}

function renderSummary() {
  const { correct, answered } = session;
  const acc = answered ? Math.round((correct / answered) * 100) : 0;
  const lv = levelInfo(me.xp);
  if (acc >= 80) confetti({ particleCount: 120, spread: 90, origin: { y: 0.5 } });

  document.getElementById('view-practice').innerHTML = `
    <div class="anim-pop mx-auto mt-8 max-w-sm rounded-xl2 bg-white p-8 text-center shadow-card">
      <p class="text-5xl">${acc >= 80 ? '🏆' : acc >= 50 ? '💪' : '🌱'}</p>
      <h2 class="mt-3 font-display text-2xl font-semibold text-slate-900">練習完成！</h2>
      <p class="mt-2 text-slate-500">答對 <span class="font-bold text-okay">${correct}</span> / ${answered} 題（${acc}%）</p>
      <div class="mt-5 rounded-xl bg-orange-50 p-4">
        <p class="text-sm font-bold text-slate-600">⭐ Lv.${lv.level} ・ ${lv.into}/${lv.need} XP</p>
        <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-orange-100">
          <div class="h-full rounded-full bg-primary" style="width:${lv.pct}%"></div>
        </div>
      </div>
      <div class="mt-6 grid gap-2">
        <button id="btn-again" class="rounded-xl bg-primary py-3 font-display font-semibold text-white transition hover:bg-primary-dark">再練一輪</button>
        <button id="btn-home" class="rounded-xl border-2 border-orange-100 py-3 font-display font-semibold text-slate-600 transition hover:bg-orange-50">回首頁</button>
      </div>
    </div>`;

  document.getElementById('btn-again').addEventListener('click', async () => {
    await loadData();
    startPractice(session.mode, session.queue[0]?.set_id);
  });
  document.getElementById('btn-home').addEventListener('click', endPractice);
}

async function endPractice() {
  session = null;
  await loadData();
  renderAll();
  showView('dashboard');
}

// ---------- 進度總覽 ----------

function renderProgress() {
  const s = stats();
  const total = s.total || 1;
  const seg = (n) => Math.round((n / total) * 100);

  const perSet = sets.map((set) => {
    const sw = words.filter((w) => w.set_id === set.id);
    let m = 0, l = 0, n = 0;
    for (const w of sw) {
      const st = wordStatus(progressMap.get(w.id));
      if (st === 'mastered') m++; else if (st === 'learning') l++; else n++;
    }
    const t = sw.length || 1;
    return `
      <div class="rounded-xl2 bg-white p-4 shadow-card">
        <p class="font-bold text-slate-900">${escapeHtml(set.name)}</p>
        <div class="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
          <div class="bg-okay" style="width:${(m / t) * 100}%"></div>
          <div class="bg-learn" style="width:${(l / t) * 100}%"></div>
        </div>
        <p class="mt-2 text-xs font-bold text-slate-500">已熟記 ${m}｜學習中 ${l}｜未學習 ${n}</p>
      </div>`;
  }).join('');

  document.getElementById('view-progress').innerHTML = `
    <h1 class="font-display text-2xl font-semibold text-slate-900">學習進度總覽</h1>

    <div class="rounded-xl2 bg-white p-6 shadow-card">
      <div class="flex h-6 overflow-hidden rounded-full bg-slate-100" role="img"
        aria-label="已熟記 ${s.mastered}、學習中 ${s.learning}、未學習 ${s.fresh}">
        <div class="bg-okay transition-all" style="width:${seg(s.mastered)}%"></div>
        <div class="bg-learn transition-all" style="width:${seg(s.learning)}%"></div>
      </div>
      <div class="mt-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <span class="mx-auto mb-1 block h-3 w-3 rounded-full bg-okay"></span>
          <p class="font-display text-2xl font-semibold text-slate-900">${s.mastered}</p>
          <p class="text-xs font-bold text-slate-500">已熟記（${seg(s.mastered)}%）</p>
        </div>
        <div>
          <span class="mx-auto mb-1 block h-3 w-3 rounded-full bg-learn"></span>
          <p class="font-display text-2xl font-semibold text-slate-900">${s.learning}</p>
          <p class="text-xs font-bold text-slate-500">學習中（${seg(s.learning)}%）</p>
        </div>
        <div>
          <span class="mx-auto mb-1 block h-3 w-3 rounded-full bg-slate-300"></span>
          <p class="font-display text-2xl font-semibold text-slate-900">${s.fresh}</p>
          <p class="text-xs font-bold text-slate-500">未學習（${seg(s.fresh)}%）</p>
        </div>
      </div>
    </div>

    <div>
      <h2 class="mb-3 font-display text-lg font-semibold text-slate-900">各單字集進度</h2>
      <div class="space-y-3">${perSet || '<p class="text-sm text-slate-400">尚無單字集</p>'}</div>
    </div>`;
}

// ---------- 錯題本 ----------

function renderWrongbook() {
  const list = wrongbookWords();
  const items = list.map((w) => {
    const p = progressMap.get(w.id);
    return `
      <div class="flex items-center gap-3 rounded-xl2 bg-white p-4 shadow-card">
        <button data-speak="${escapeHtml(w.english)}"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-learn/10 text-learn transition hover:bg-learn/20 active:scale-95" aria-label="播放 ${escapeHtml(w.english)} 發音">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M11 5L6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 010 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="min-w-0 flex-1">
          <p class="font-display text-lg font-semibold text-slate-900">${escapeHtml(w.english)}</p>
          <p class="truncate text-sm text-slate-500">${escapeHtml(w.chinese)}</p>
        </div>
        <span class="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">錯 ${p.wrong_count} 次</span>
      </div>`;
  }).join('');

  document.getElementById('view-wrongbook').innerHTML = `
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-semibold text-slate-900">錯題本 📕</h1>
      ${list.length ? `<button id="btn-wrong-practice"
        class="rounded-xl bg-learn px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 active:scale-95">複習錯題（${list.length}）</button>` : ''}
    </div>
    <p class="text-sm text-slate-500">答錯 2 次以上、還沒熟記的單字會自動收錄在這裡。</p>
    <div class="space-y-3">
      ${items || `<div class="rounded-xl2 bg-white p-8 text-center shadow-card">
        <p class="text-3xl">🌟</p>
        <p class="mt-2 font-bold text-slate-600">太棒了，目前沒有常錯的單字！</p>
      </div>`}
    </div>`;

  document.getElementById('btn-wrong-practice')?.addEventListener('click', () => startPractice('wrong'));
  document.querySelectorAll('[data-speak]').forEach((btn) =>
    btn.addEventListener('click', () => speak(btn.dataset.speak))
  );
}

// ---------- 啟動 ----------

function renderAll() {
  renderDashboard();
  renderProgress();
  renderWrongbook();
}

(async () => {
  me = await requireUser('student');
  if (!me) return;
  document.getElementById('topbar-name').textContent = me.display_name;
  await loadData();
  renderAll();
  showView('dashboard');
})();
