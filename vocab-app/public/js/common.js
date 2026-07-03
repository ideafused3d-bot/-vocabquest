// ============================================================
// 共用工具：Supabase client、登入守衛、等級計算、發音、UI 小工具
// ============================================================

const sb = supabase.createClient(
  window.VOCAB_CONFIG.SUPABASE_URL,
  window.VOCAB_CONFIG.SUPABASE_ANON_KEY
);

// 帳號名 → 內部虛擬 email（學生不需要真實 email）
const FAKE_EMAIL_DOMAIN = 'vocab.local';
function toEmail(username) {
  return `${username.trim().toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}

// 取得目前登入者 profile；未登入或角色不符則導回登入頁
async function requireUser(expectedRole) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = 'index.html';
    return null;
  }
  const { data: profile, error } = await sb
    .from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) {
    await sb.auth.signOut();
    location.href = 'index.html';
    return null;
  }
  if (expectedRole && profile.role !== expectedRole) {
    location.href = profile.role === 'teacher' ? 'teacher.html' : 'student.html';
    return null;
  }
  return profile;
}

async function logout() {
  await sb.auth.signOut();
  location.href = 'index.html';
}

// 等級：升到第 N 級需要 N*100 XP（累進）。Lv1→2 要 100、Lv2→3 要 200…
function levelInfo(xp) {
  let level = 1;
  let rest = xp;
  while (rest >= level * 100) {
    rest -= level * 100;
    level++;
  }
  return { level, into: rest, need: level * 100, pct: Math.round((rest / (level * 100)) * 100) };
}

// Web Speech API 發音（英文）
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  speechSynthesis.speak(u);
}

// 單字學習狀態：無進度 → 未學習；box>=5 → 已熟記；其餘 → 學習中
const MASTERED_BOX = 5;
function wordStatus(progress) {
  if (!progress || !progress.last_reviewed_at) return 'new';
  return progress.box >= MASTERED_BOX ? 'mastered' : 'learning';
}

// 錯題本收錄門檻：答錯 2 次以上且尚未熟記
function isWrongBookWord(progress) {
  return progress && progress.wrong_count >= 2 && progress.box < MASTERED_BOX;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function toast(msg, type = 'info') {
  const colors = {
    info: 'bg-slate-800 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  };
  const el = document.createElement('div');
  el.className = `fixed bottom-20 left-1/2 z-[200] -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg ${colors[type]}`;
  el.style.animation = 'toast-in .25s ease-out';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 2600);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
