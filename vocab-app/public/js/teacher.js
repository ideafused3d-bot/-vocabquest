// ============================================================
// 老師端：總覽 / 學生管理 / 單字集管理與指派
// ============================================================

let me = null;
let students = [];    // 所有學生 profiles
let sets = [];        // 所有單字集
let words = [];       // 所有單字
let assignments = []; // 所有指派
let progress = [];    // 所有學生的 word_progress

// 建立學生帳號用的獨立 client（避免 signUp 蓋掉老師自己的登入狀態）
const sbSignup = supabase.createClient(
  window.VOCAB_CONFIG.SUPABASE_URL,
  window.VOCAB_CONFIG.SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ---------- 資料載入 ----------

async function loadData() {
  const [st, se, wo, as, pr] = await Promise.all([
    sb.from('profiles').select('*').eq('role', 'student').order('display_name'),
    sb.from('word_sets').select('*').order('created_at'),
    sb.from('words').select('*').order('id'),
    sb.from('assignments').select('*'),
    sb.from('word_progress').select('*'),
  ]);
  students = st.data || [];
  sets = se.data || [];
  words = wo.data || [];
  assignments = as.data || [];
  progress = pr.data || [];
}

function studentStats(studentId) {
  const assignedSetIds = new Set(assignments.filter((a) => a.student_id === studentId).map((a) => a.set_id));
  const assignedWords = words.filter((w) => assignedSetIds.has(w.set_id));
  const progMap = new Map(progress.filter((p) => p.student_id === studentId).map((p) => [p.word_id, p]));
  let mastered = 0, learning = 0, fresh = 0;
  const wrong = [];
  for (const w of assignedWords) {
    const p = progMap.get(w.id);
    const st = wordStatus(p);
    if (st === 'mastered') mastered++;
    else if (st === 'learning') learning++;
    else fresh++;
    if (isWrongBookWord(p)) wrong.push({ ...w, wrong_count: p.wrong_count });
  }
  wrong.sort((a, b) => b.wrong_count - a.wrong_count);
  return { mastered, learning, fresh, total: assignedWords.length, wrong, assignedSetIds };
}

// ---------- 視圖切換 ----------

const VIEWS = ['dashboard', 'students', 'student-detail', 'sets'];

function showView(name) {
  for (const v of VIEWS) {
    document.getElementById(`view-${v}`).classList.toggle('hidden', v !== name);
  }
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    const active = btn.dataset.nav === name || (name === 'student-detail' && btn.dataset.nav === 'students');
    btn.classList.toggle('text-primary', active);
    btn.classList.toggle('text-slate-400', !active);
  });
  window.scrollTo({ top: 0 });
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    await loadData();
    renderAll();
    showView(btn.dataset.nav);
  });
});

// ---------- 總覽 ----------

function renderDashboard() {
  const masteredTotal = progress.filter((p) => p.box >= MASTERED_BOX && p.last_reviewed_at).length;
  const cards = [
    { icon: '🧑‍🎓', label: '學生總數', value: students.length },
    { icon: '📚', label: '單字集數', value: sets.length },
    { icon: '🔤', label: '總單字數', value: words.length },
    { icon: '✅', label: '全體已熟記', value: masteredTotal },
  ].map((c) => `
    <div class="rounded-xl2 bg-white p-5 shadow-card">
      <p class="text-2xl">${c.icon}</p>
      <p class="mt-1 font-display text-3xl font-semibold text-slate-900">${c.value}</p>
      <p class="text-sm font-bold text-slate-500">${c.label}</p>
    </div>`).join('');

  const recent = students
    .filter((s) => s.last_active_date)
    .sort((a, b) => (b.last_active_date || '').localeCompare(a.last_active_date || ''))
    .slice(0, 5)
    .map((s) => `
      <div class="flex items-center justify-between rounded-xl bg-orange-50/60 px-4 py-3">
        <span class="font-bold text-slate-700">${escapeHtml(s.display_name)}</span>
        <span class="text-sm text-slate-500">最近練習：${s.last_active_date}　🔥 ${s.streak_days} 天</span>
      </div>`).join('');

  document.getElementById('view-dashboard').innerHTML = `
    <div>
      <h1 class="font-display text-2xl font-semibold text-slate-900">${escapeHtml(me.display_name)}，歡迎回來 👩‍🏫</h1>
      <p class="mt-1 text-sm text-slate-500">全班學習狀況一覽</p>
    </div>
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">${cards}</div>
    <div class="rounded-xl2 bg-white p-5 shadow-card">
      <h2 class="font-display text-lg font-semibold text-slate-900">近期活躍學生</h2>
      <div class="mt-3 space-y-2">${recent || '<p class="text-sm text-slate-400">還沒有學生練習紀錄</p>'}</div>
    </div>`;
}

// ---------- 學生管理 ----------

function renderStudents() {
  const rows = students.map((s) => {
    const st = studentStats(s.id);
    const lv = levelInfo(s.xp);
    return `
      <button data-student="${s.id}" class="w-full rounded-xl2 bg-white p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber2 font-display text-lg font-semibold text-white">
              ${escapeHtml(s.display_name.charAt(0))}
            </span>
            <div>
              <p class="font-bold text-slate-900">${escapeHtml(s.display_name)}</p>
              <p class="text-xs text-slate-500">@${escapeHtml(s.username)}</p>
            </div>
          </div>
          <div class="flex items-center gap-4 text-sm font-bold text-slate-600">
            <span>🔥 ${s.streak_days}</span>
            <span>⭐ Lv.${lv.level}</span>
            <span class="hidden sm:inline">✅ ${st.mastered}/${st.total}</span>
            <span class="text-slate-300">›</span>
          </div>
        </div>
      </button>`;
  }).join('');

  document.getElementById('view-students').innerHTML = `
    <div class="flex items-center justify-between">
      <h1 class="font-display text-2xl font-semibold text-slate-900">學生管理</h1>
      <button id="btn-add-student" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-95">＋ 新增學生</button>
    </div>
    <div class="space-y-3">
      ${rows || `<div class="rounded-xl2 bg-white p-8 text-center shadow-card">
        <p class="text-3xl">🧑‍🎓</p>
        <p class="mt-2 font-bold text-slate-600">還沒有學生</p>
        <p class="mt-1 text-sm text-slate-400">點右上角「新增學生」建立第一個學生帳號</p>
      </div>`}
    </div>`;

  document.getElementById('btn-add-student').addEventListener('click', openAddStudentModal);
  document.querySelectorAll('[data-student]').forEach((btn) =>
    btn.addEventListener('click', () => {
      renderStudentDetail(btn.dataset.student);
      showView('student-detail');
    })
  );
}

function openAddStudentModal() {
  openModal(`
    <h2 class="font-display text-xl font-semibold text-slate-900">新增學生帳號</h2>
    <form id="form-add-student" class="mt-4 space-y-3">
      <div>
        <label class="mb-1 block text-sm font-bold text-slate-700" for="ns-name">學生姓名</label>
        <input id="ns-name" required class="w-full rounded-xl border-2 border-orange-100 px-4 py-2.5 outline-none focus:border-primary" placeholder="例如：小明" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-bold text-slate-700" for="ns-username">帳號（英數字，給學生登入用）</label>
        <input id="ns-username" required pattern="[a-zA-Z0-9_]{3,20}" autocapitalize="none" class="w-full rounded-xl border-2 border-orange-100 px-4 py-2.5 outline-none focus:border-primary" placeholder="例如 ming01" />
      </div>
      <div>
        <label class="mb-1 block text-sm font-bold text-slate-700" for="ns-password">密碼（至少 6 碼）</label>
        <input id="ns-password" required minlength="6" class="w-full rounded-xl border-2 border-orange-100 px-4 py-2.5 outline-none focus:border-primary" placeholder="請記下來告訴學生" />
      </div>
      <p id="ns-error" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600" role="alert"></p>
      <div class="flex gap-2 pt-1">
        <button type="button" class="modal-close flex-1 rounded-xl border-2 border-orange-100 py-2.5 font-bold text-slate-600 hover:bg-orange-50">取消</button>
        <button type="submit" id="ns-submit" class="flex-1 rounded-xl bg-primary py-2.5 font-bold text-white hover:bg-primary-dark">建立</button>
      </div>
    </form>`);

  document.getElementById('form-add-student').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ns-submit');
    btn.disabled = true;
    btn.textContent = '建立中…';
    const username = document.getElementById('ns-username').value.trim().toLowerCase();
    const { error } = await sbSignup.auth.signUp({
      email: toEmail(username),
      password: document.getElementById('ns-password').value,
      options: {
        data: {
          username,
          display_name: document.getElementById('ns-name').value.trim(),
          role: 'student',
        },
      },
    });
    if (error) {
      const el = document.getElementById('ns-error');
      el.textContent = error.message.includes('already registered') ? '這個帳號已經存在' : `建立失敗：${error.message}`;
      el.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '建立';
      return;
    }
    closeModal();
    toast(`已建立學生帳號「${username}」`, 'success');
    await loadData();
    renderAll();
  });
}

function renderStudentDetail(studentId) {
  const s = students.find((x) => x.id === studentId);
  if (!s) return;
  const st = studentStats(s.id);
  const lv = levelInfo(s.xp);
  const total = st.total || 1;

  const setCards = sets.filter((set) => st.assignedSetIds.has(set.id)).map((set) => {
    const sw = words.filter((w) => w.set_id === set.id);
    const progMap = new Map(progress.filter((p) => p.student_id === s.id).map((p) => [p.word_id, p]));
    const m = sw.filter((w) => wordStatus(progMap.get(w.id)) === 'mastered').length;
    return `
      <div class="flex items-center justify-between rounded-xl bg-orange-50/60 px-4 py-3">
        <span class="font-bold text-slate-700">${escapeHtml(set.name)}</span>
        <span class="text-sm font-bold text-slate-500">熟記 ${m}/${sw.length}</span>
      </div>`;
  }).join('');

  const wrongRows = st.wrong.slice(0, 10).map((w) => `
    <div class="flex items-center justify-between rounded-xl bg-red-50/70 px-4 py-3">
      <div>
        <span class="font-display font-semibold text-slate-900">${escapeHtml(w.english)}</span>
        <span class="ml-2 text-sm text-slate-500">${escapeHtml(w.chinese)}</span>
      </div>
      <span class="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-red-600">錯 ${w.wrong_count} 次</span>
    </div>`).join('');

  document.getElementById('view-student-detail').innerHTML = `
    <button id="btn-back-students" class="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-primary">← 回學生列表</button>

    <div class="flex items-center gap-4">
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber2 font-display text-2xl font-semibold text-white">
        ${escapeHtml(s.display_name.charAt(0))}
      </span>
      <div>
        <h1 class="font-display text-2xl font-semibold text-slate-900">${escapeHtml(s.display_name)}</h1>
        <p class="text-sm text-slate-500">@${escapeHtml(s.username)}　🔥 ${s.streak_days} 天　⭐ Lv.${lv.level}（${s.xp} XP）</p>
      </div>
    </div>

    <div class="rounded-xl2 bg-white p-5 shadow-card">
      <h2 class="font-display text-lg font-semibold text-slate-900">學習狀況</h2>
      <div class="mt-3 flex h-4 overflow-hidden rounded-full bg-slate-100" role="img"
        aria-label="已熟記 ${st.mastered}、學習中 ${st.learning}、未學習 ${st.fresh}">
        <div class="bg-okay" style="width:${(st.mastered / total) * 100}%"></div>
        <div class="bg-learn" style="width:${(st.learning / total) * 100}%"></div>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-3 text-center">
        <div><p class="font-display text-xl font-semibold text-okay">${st.mastered}</p><p class="text-xs font-bold text-slate-500">已熟記</p></div>
        <div><p class="font-display text-xl font-semibold text-learn">${st.learning}</p><p class="text-xs font-bold text-slate-500">學習中</p></div>
        <div><p class="font-display text-xl font-semibold text-slate-400">${st.fresh}</p><p class="text-xs font-bold text-slate-500">未學習</p></div>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-2">
      <div class="rounded-xl2 bg-white p-5 shadow-card">
        <h2 class="font-display text-lg font-semibold text-slate-900">被指派的單字集</h2>
        <div class="mt-3 space-y-2">${setCards || '<p class="text-sm text-slate-400">尚未指派任何單字集</p>'}</div>
      </div>
      <div class="rounded-xl2 bg-white p-5 shadow-card">
        <h2 class="font-display text-lg font-semibold text-slate-900">常答錯單字 Top 10</h2>
        <div class="mt-3 space-y-2">${wrongRows || '<p class="text-sm text-slate-400">目前沒有常錯單字 🎉</p>'}</div>
      </div>
    </div>`;

  document.getElementById('btn-back-students').addEventListener('click', () => showView('students'));
}

// ---------- 單字集管理 ----------

function renderSets() {
  const cards = sets.map((set) => {
    const count = words.filter((w) => w.set_id === set.id).length;
    const assigned = assignments.filter((a) => a.set_id === set.id).length;
    const diffColor = { '初級': 'bg-green-100 text-green-700', '中級': 'bg-amber-100 text-amber-700', '高級': 'bg-red-100 text-red-700' }[set.difficulty] || 'bg-slate-100 text-slate-600';
    return `
      <div class="rounded-xl2 bg-white p-5 shadow-card">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate font-display text-lg font-semibold text-slate-900">${escapeHtml(set.name)}</p>
            <p class="mt-1 text-sm text-slate-500">${escapeHtml(set.category)}</p>
          </div>
          <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${diffColor}">${escapeHtml(set.difficulty)}</span>
        </div>
        <p class="mt-3 text-sm font-bold text-slate-500">🔤 ${count} 個單字　🧑‍🎓 已指派 ${assigned} 位學生</p>
        <div class="mt-4 flex gap-2">
          <button data-edit-set="${set.id}" class="flex-1 rounded-xl border-2 border-orange-100 py-2 text-sm font-bold text-slate-600 transition hover:bg-orange-50">編輯</button>
          <button data-assign-set="${set.id}" class="flex-1 rounded-xl bg-learn py-2 text-sm font-bold text-white transition hover:brightness-110">指派</button>
          <button data-del-set="${set.id}" class="rounded-xl border-2 border-red-100 px-3 py-2 text-sm font-bold text-red-500 transition hover:bg-red-50" aria-label="刪除單字集">🗑</button>
        </div>
      </div>`;
  }).join('');

  document.getElementById('view-sets').innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-display text-2xl font-semibold text-slate-900">單字集管理</h1>
      <div class="flex gap-2">
        ${sets.length === 0 ? '<button id="btn-demo" class="rounded-xl border-2 border-orange-200 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-orange-50">✨ 匯入示範資料</button>' : ''}
        <button id="btn-add-set" class="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark active:scale-95">＋ 新增單字集</button>
      </div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${cards || `<div class="rounded-xl2 bg-white p-8 text-center shadow-card sm:col-span-2 lg:col-span-3">
        <p class="text-3xl">📚</p>
        <p class="mt-2 font-bold text-slate-600">還沒有單字集</p>
        <p class="mt-1 text-sm text-slate-400">按「新增單字集」開始，或先「匯入示範資料」看看效果</p>
      </div>`}
    </div>`;

  document.getElementById('btn-add-set').addEventListener('click', () => openSetEditor(null));
  document.getElementById('btn-demo')?.addEventListener('click', importDemoData);
  document.querySelectorAll('[data-edit-set]').forEach((b) =>
    b.addEventListener('click', () => openSetEditor(Number(b.dataset.editSet))));
  document.querySelectorAll('[data-assign-set]').forEach((b) =>
    b.addEventListener('click', () => openAssignModal(Number(b.dataset.assignSet))));
  document.querySelectorAll('[data-del-set]').forEach((b) =>
    b.addEventListener('click', () => deleteSet(Number(b.dataset.delSet))));
}

function wordRowHtml(w = { english: '', chinese: '' }, id = '') {
  return `
    <div class="word-row flex items-center gap-2" data-word-id="${id}">
      <input class="w-english min-w-0 flex-1 rounded-lg border-2 border-orange-100 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="英文" value="${escapeHtml(w.english)}" />
      <input class="w-chinese min-w-0 flex-1 rounded-lg border-2 border-orange-100 px-3 py-2 text-sm outline-none focus:border-primary" placeholder="中文" value="${escapeHtml(w.chinese)}" />
      <button type="button" class="w-remove shrink-0 rounded-lg px-2 py-2 text-slate-400 hover:text-red-500" aria-label="移除此單字">✕</button>
    </div>`;
}

function openSetEditor(setId) {
  const set = setId ? sets.find((s) => s.id === setId) : null;
  const setWords = setId ? words.filter((w) => w.set_id === setId) : [];

  openModal(`
    <h2 class="font-display text-xl font-semibold text-slate-900">${set ? '編輯單字集' : '新增單字集'}</h2>
    <form id="form-set" class="mt-4 space-y-3">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <label class="mb-1 block text-sm font-bold text-slate-700" for="se-name">名稱</label>
          <input id="se-name" required class="w-full rounded-xl border-2 border-orange-100 px-4 py-2.5 outline-none focus:border-primary" placeholder="例如：Unit 1 - 日常生活" value="${escapeHtml(set?.name || '')}" />
        </div>
        <div>
          <label class="mb-1 block text-sm font-bold text-slate-700" for="se-diff">難度</label>
          <select id="se-diff" class="w-full rounded-xl border-2 border-orange-100 px-3 py-2.5 outline-none focus:border-primary">
            ${['初級', '中級', '高級'].map((d) => `<option ${set?.difficulty === d ? 'selected' : ''}>${d}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label class="mb-1 block text-sm font-bold text-slate-700" for="se-cat">分類</label>
        <input id="se-cat" class="w-full rounded-xl border-2 border-orange-100 px-4 py-2.5 outline-none focus:border-primary" placeholder="例如：日常生活" value="${escapeHtml(set?.category || '')}" />
      </div>

      <div>
        <div class="mb-1 flex items-center justify-between">
          <span class="text-sm font-bold text-slate-700">單字（中文、英文）</span>
          <button type="button" id="se-bulk-toggle" class="text-xs font-bold text-learn hover:underline">批次貼上</button>
        </div>
        <div id="se-bulk" class="hidden pb-2">
          <textarea id="se-bulk-text" rows="4" class="w-full rounded-xl border-2 border-orange-100 px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="每行一個單字，格式：英文,中文&#10;apple,蘋果&#10;school,學校"></textarea>
          <button type="button" id="se-bulk-add" class="mt-1 rounded-lg bg-learn px-3 py-1.5 text-xs font-bold text-white">加入清單</button>
        </div>
        <div id="se-words" class="max-h-64 space-y-2 overflow-y-auto pr-1">
          ${setWords.map((w) => wordRowHtml(w, w.id)).join('') || wordRowHtml()}
        </div>
        <button type="button" id="se-add-row" class="mt-2 w-full rounded-xl border-2 border-dashed border-orange-200 py-2 text-sm font-bold text-primary transition hover:bg-orange-50">＋ 新增一列</button>
      </div>

      <p id="se-error" class="hidden rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600" role="alert"></p>
      <div class="flex gap-2 pt-1">
        <button type="button" class="modal-close flex-1 rounded-xl border-2 border-orange-100 py-2.5 font-bold text-slate-600 hover:bg-orange-50">取消</button>
        <button type="submit" id="se-submit" class="flex-1 rounded-xl bg-primary py-2.5 font-bold text-white hover:bg-primary-dark">儲存</button>
      </div>
    </form>`);

  const wordsBox = document.getElementById('se-words');
  const bindRemove = () => wordsBox.querySelectorAll('.w-remove').forEach((btn) => {
    btn.onclick = () => btn.closest('.word-row').remove();
  });
  bindRemove();

  document.getElementById('se-add-row').addEventListener('click', () => {
    wordsBox.insertAdjacentHTML('beforeend', wordRowHtml());
    bindRemove();
    wordsBox.lastElementChild.querySelector('.w-english').focus();
  });

  document.getElementById('se-bulk-toggle').addEventListener('click', () =>
    document.getElementById('se-bulk').classList.toggle('hidden'));
  document.getElementById('se-bulk-add').addEventListener('click', () => {
    const lines = document.getElementById('se-bulk-text').value.split('\n');
    for (const line of lines) {
      const [en, zh] = line.split(/[,，]/).map((s) => s?.trim());
      if (en && zh) {
        wordsBox.insertAdjacentHTML('beforeend', wordRowHtml({ english: en, chinese: zh }));
      }
    }
    document.getElementById('se-bulk-text').value = '';
    bindRemove();
  });

  document.getElementById('form-set').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('se-submit');
    btn.disabled = true;
    btn.textContent = '儲存中…';

    const rows = [...wordsBox.querySelectorAll('.word-row')].map((row) => ({
      id: row.dataset.wordId ? Number(row.dataset.wordId) : null,
      english: row.querySelector('.w-english').value.trim(),
      chinese: row.querySelector('.w-chinese').value.trim(),
    })).filter((r) => r.english && r.chinese);

    if (!rows.length) {
      const el = document.getElementById('se-error');
      el.textContent = '至少要有一個完整的單字（英文＋中文）';
      el.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '儲存';
      return;
    }

    try {
      let targetSetId = setId;
      const meta = {
        name: document.getElementById('se-name').value.trim(),
        category: document.getElementById('se-cat').value.trim(),
        difficulty: document.getElementById('se-diff').value,
      };

      if (set) {
        const { error } = await sb.from('word_sets').update(meta).eq('id', set.id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('word_sets')
          .insert({ ...meta, teacher_id: me.id }).select().single();
        if (error) throw error;
        targetSetId = data.id;
      }

      // 差異更新：保留原 id 的單字（保住學生進度），刪除被移除的、更新變動的、新增新的
      const keptIds = new Set(rows.filter((r) => r.id).map((r) => r.id));
      const removed = setWords.filter((w) => !keptIds.has(w.id)).map((w) => w.id);
      if (removed.length) {
        const { error } = await sb.from('words').delete().in('id', removed);
        if (error) throw error;
      }
      for (const r of rows.filter((r) => r.id)) {
        const orig = setWords.find((w) => w.id === r.id);
        if (orig && (orig.english !== r.english || orig.chinese !== r.chinese)) {
          const { error } = await sb.from('words')
            .update({ english: r.english, chinese: r.chinese }).eq('id', r.id);
          if (error) throw error;
        }
      }
      const added = rows.filter((r) => !r.id)
        .map((r) => ({ set_id: targetSetId, english: r.english, chinese: r.chinese }));
      if (added.length) {
        const { error } = await sb.from('words').insert(added);
        if (error) throw error;
      }

      closeModal();
      toast('單字集已儲存', 'success');
      await loadData();
      renderAll();
    } catch (err) {
      const el = document.getElementById('se-error');
      el.textContent = `儲存失敗：${err.message}`;
      el.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = '儲存';
    }
  });
}

async function deleteSet(setId) {
  const set = sets.find((s) => s.id === setId);
  if (!confirm(`確定要刪除「${set.name}」嗎？\n單字與所有學生的相關練習進度都會一併刪除，無法復原。`)) return;
  const { error } = await sb.from('word_sets').delete().eq('id', setId);
  if (error) {
    toast(`刪除失敗：${error.message}`, 'error');
    return;
  }
  toast('已刪除單字集', 'success');
  await loadData();
  renderAll();
}

function openAssignModal(setId) {
  const set = sets.find((s) => s.id === setId);
  const assignedIds = new Set(assignments.filter((a) => a.set_id === setId).map((a) => a.student_id));

  openModal(`
    <h2 class="font-display text-xl font-semibold text-slate-900">指派「${escapeHtml(set.name)}」</h2>
    <p class="mt-1 text-sm text-slate-500">勾選要練習這個單字集的學生</p>
    <div class="mt-4 max-h-72 space-y-2 overflow-y-auto">
      ${students.map((s) => `
        <label class="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-orange-100 px-4 py-3 transition has-[:checked]:border-learn has-[:checked]:bg-learn/5">
          <input type="checkbox" class="assign-check h-5 w-5 accent-learn" value="${s.id}" ${assignedIds.has(s.id) ? 'checked' : ''} />
          <span class="font-bold text-slate-700">${escapeHtml(s.display_name)}</span>
          <span class="text-xs text-slate-400">@${escapeHtml(s.username)}</span>
        </label>`).join('') || '<p class="text-sm text-slate-400">還沒有學生，請先到「學生」頁新增</p>'}
    </div>
    <div class="mt-4 flex gap-2">
      <button type="button" class="modal-close flex-1 rounded-xl border-2 border-orange-100 py-2.5 font-bold text-slate-600 hover:bg-orange-50">取消</button>
      <button id="assign-save" class="flex-1 rounded-xl bg-learn py-2.5 font-bold text-white hover:brightness-110">儲存指派</button>
    </div>`);

  document.getElementById('assign-save').addEventListener('click', async () => {
    const checked = new Set([...document.querySelectorAll('.assign-check:checked')].map((c) => c.value));
    const toAdd = [...checked].filter((id) => !assignedIds.has(id))
      .map((id) => ({ set_id: setId, student_id: id }));
    const toRemove = [...assignedIds].filter((id) => !checked.has(id));

    try {
      if (toAdd.length) {
        const { error } = await sb.from('assignments').insert(toAdd);
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await sb.from('assignments')
          .delete().eq('set_id', setId).in('student_id', toRemove);
        if (error) throw error;
      }
      closeModal();
      toast('指派已更新', 'success');
      await loadData();
      renderAll();
    } catch (err) {
      toast(`儲存失敗：${err.message}`, 'error');
    }
  });
}

// ---------- 示範資料 ----------

const DEMO_SETS = [
  {
    name: 'Unit 1 - 日常生活', category: '日常生活', difficulty: '初級',
    words: [
      ['breakfast', '早餐'], ['umbrella', '雨傘'], ['weather', '天氣'], ['kitchen', '廚房'],
      ['medicine', '藥'], ['bicycle', '腳踏車'], ['garbage', '垃圾'], ['towel', '毛巾'],
      ['mirror', '鏡子'], ['blanket', '毯子'], ['refrigerator', '冰箱'], ['stairs', '樓梯'],
      ['neighbor', '鄰居'], ['market', '市場'], ['convenient', '方便的'],
    ],
  },
  {
    name: 'Unit 2 - 校園生活', category: '校園生活', difficulty: '中級',
    words: [
      ['assignment', '作業'], ['knowledge', '知識'], ['experiment', '實驗'], ['principal', '校長'],
      ['semester', '學期'], ['scholarship', '獎學金'], ['literature', '文學'], ['geography', '地理'],
      ['discussion', '討論'], ['presentation', '簡報'], ['dictionary', '字典'], ['graduate', '畢業'],
      ['competition', '比賽'], ['encourage', '鼓勵'], ['concentrate', '專心'],
    ],
  },
];

async function importDemoData() {
  try {
    for (const demo of DEMO_SETS) {
      const { data: set, error } = await sb.from('word_sets').insert({
        teacher_id: me.id, name: demo.name, category: demo.category, difficulty: demo.difficulty,
      }).select().single();
      if (error) throw error;
      const { error: werr } = await sb.from('words').insert(
        demo.words.map(([english, chinese]) => ({ set_id: set.id, english, chinese }))
      );
      if (werr) throw werr;
    }
    toast('示範資料匯入完成！記得指派給學生', 'success');
    await loadData();
    renderAll();
  } catch (err) {
    toast(`匯入失敗：${err.message}`, 'error');
  }
}

// ---------- Modal 工具 ----------

function openModal(innerHtml) {
  document.getElementById('modal-root').innerHTML = `
    <div id="modal-overlay" class="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div class="anim-pop max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" role="dialog" aria-modal="true">
        ${innerHtml}
      </div>
    </div>`;
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.querySelectorAll('.modal-close').forEach((b) => b.addEventListener('click', closeModal));
  document.addEventListener('keydown', escClose);
}

function escClose(e) { if (e.key === 'Escape') closeModal(); }

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.removeEventListener('keydown', escClose);
}

// ---------- 啟動 ----------

function renderAll() {
  renderDashboard();
  renderStudents();
  renderSets();
}

(async () => {
  me = await requireUser('teacher');
  if (!me) return;
  document.getElementById('topbar-name').textContent = me.display_name;
  await loadData();
  renderAll();
  showView('dashboard');
})();
