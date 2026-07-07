#!/usr/bin/env node
// harness doctor — 開機自檢（通用層腳本：專案事實一律來自 docs/project/harness-config.json 與 ENV-FACTS.md）
// 用法：在 repo 根目錄執行 `node docs/harness/scripts/doctor.mjs`；exit 0 = 無 FAIL。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
let pass = 0, warn = 0, fail = 0;
const P = (m) => { console.log('[PASS] ' + m); pass++; };
const W = (m) => { console.log('[WARN] ' + m); warn++; };
const F = (m) => { console.log('[FAIL] ' + m); fail++; };

// 1) runtime
P(`node ${process.version}`);

// 2) harness-config.json
const cfgPath = path.join(root, 'docs/project/harness-config.json');
let cfg = null;
if (!fs.existsSync(cfgPath)) {
  F('docs/project/harness-config.json 不存在（hooks 會 fail-open，物理防線失效）');
} else {
  try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); P('harness-config.json 可解析'); }
  catch (e) { F('harness-config.json 解析失敗：' + e.message); }
}

// 3) CLAUDE.md 行數上限 ＋ 4) 路由表路徑存在性
const cmPath = path.join(root, 'CLAUDE.md');
if (!fs.existsSync(cmPath)) {
  F('CLAUDE.md 不存在');
} else {
  const text = fs.readFileSync(cmPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const n = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  const max = (cfg && cfg.claudeMdMaxLines) || 120;
  if (n <= max) P(`CLAUDE.md ${n} 行（上限 ${max}）`);
  else F(`CLAUDE.md ${n} 行，超過上限 ${max}（違反路由中心原則，先精簡再開工）`);

  const seen = new Set();
  for (const m of text.matchAll(/`([^`\s]+\.(?:md|mjs|json|js|sql|html|yml))`/g)) seen.add(m[1]);
  let ok = 0;
  for (const p of seen) {
    if (fs.existsSync(path.join(root, p))) ok++;
    else F(`CLAUDE.md 引用的路徑不存在：${p}`);
  }
  if (ok > 0) P(`CLAUDE.md 引用的檔案路徑存在：${ok}/${seen.size}`);
}

// 5) ENV-FACTS 段落契約
const efPath = path.join(root, 'docs/project/ENV-FACTS.md');
if (!fs.existsSync(efPath)) {
  F('docs/project/ENV-FACTS.md 不存在');
} else {
  const t = fs.readFileSync(efPath, 'utf8');
  const missing = ((cfg && cfg.requiredEnvFactsSections) || []).filter((s) => !t.includes('## ' + s));
  if (missing.length === 0) P('ENV-FACTS 段落契約完整（§ 編號齊全）');
  else F('ENV-FACTS 缺段落：' + missing.join(', '));
}

// 6) 驗證指令指向的檔案存在
for (const c of (cfg && cfg.verifyCommands) || []) {
  const m = c.match(/(\S+\.(?:js|mjs|cjs|ts))\s*$/);
  if (!m) continue;
  if (fs.existsSync(path.join(root, m[1]))) pass++; // 靜默計數，避免刷屏
  else F(`ENV-FACTS §3 驗證指令指向不存在的檔案：${c}`);
}
P('驗證指令目標檔案檢查完成');

// 7) hooks 狀態與腳本語法
let hooksEnabled = false;
const spPath = path.join(root, '.claude/settings.json');
if (fs.existsSync(spPath)) {
  try {
    const s = JSON.parse(fs.readFileSync(spPath, 'utf8'));
    hooksEnabled = !!(s.hooks && Object.keys(s.hooks).length > 0);
  } catch { F('.claude/settings.json 存在但解析失敗'); }
}
if (hooksEnabled) P('hooks 已在專案 .claude/settings.json 註冊');
else W('hooks 未啟用（物理防線關閉；規則層紅線仍有效。啟用需 User 同意，見 settings-hooks.proposed.json）');

for (const f of ['docs/harness/scripts/hooks/block-push-protected.mjs', 'docs/harness/scripts/hooks/protect-frozen.mjs']) {
  if (!fs.existsSync(path.join(root, f))) { F('hook 腳本不存在：' + f); continue; }
  try { execSync(`node --check "${f}"`, { cwd: root, stdio: 'pipe' }); P('hook 腳本語法 OK：' + f); }
  catch { F('hook 腳本語法錯誤：' + f); }
}

// 8) 目前分支 vs 保護分支
try {
  const br = execSync('git rev-parse --abbrev-ref HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  if (((cfg && cfg.protectedBranches) || []).includes(br)) W(`目前在保護分支「${br}」上——動工前先開 feature 分支（ENV-FACTS §4）`);
  else P(`目前分支：${br}（非保護分支）`);
} catch { W('無法取得 git 分支（不在 git repo？）'); }

console.log(`\nDOCTOR RESULT: ${fail === 0 ? 'OK' : 'FAIL'} — pass=${pass} warn=${warn} fail=${fail}`);
process.exit(fail === 0 ? 0 : 1);
