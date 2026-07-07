#!/usr/bin/env node
// PreToolUse hook（matcher: Bash）：攔截推送保護分支與 force push。
// 保護分支清單來自 <cwd>/docs/project/harness-config.json（專案層）；設定檔不存在 → 放行（fail-open，由 doctor 負責警告）。
// User 同意的覆寫方式：執行前設環境變數 HARNESS_ALLOW_PROTECTED=1（變數名可在 config 改）。
// exit 2 = 阻擋並把 stderr 訊息回饋給模型；exit 0 = 放行。
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
if (input.tool_name !== 'Bash') process.exit(0);
const cmd = (input.tool_input && input.tool_input.command) || '';
if (!/\bgit\b[^\n]*\bpush\b/.test(cmd)) process.exit(0);

const cwd = input.cwd || process.cwd();
let cfg;
try { cfg = JSON.parse(fs.readFileSync(path.join(cwd, 'docs/project/harness-config.json'), 'utf8')); } catch { process.exit(0); }
const prot = cfg.protectedBranches || [];
const overrideVar = cfg.overrideEnvVar || 'HARNESS_ALLOW_PROTECTED';
if (process.env[overrideVar] === '1') process.exit(0);

const block = (msg) => { console.error(msg); process.exit(2); };

if (/\bpush\b[^\n]*(\s--force\b|\s-f\b|\s--force-with-lease\b)/.test(cmd)) {
  block('BLOCKED: git push --force 被 harness 禁止（ENV-FACTS §4 通用禁令）。');
}
for (const b of prot) {
  if (new RegExp(`\\bpush\\b[^\\n]*\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(cmd)) {
    block(`BLOCKED: 指令會推送保護分支「${b}」。${cfg.protectedBranchReason || ''} 需 User 明確同意（同意後由 User 設 ${overrideVar}=1，或由 User 自行執行）。`);
  }
}
// 未指名分支的 push：以當前分支判定
let br = '';
try { br = execSync('git rev-parse --abbrev-ref HEAD', { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
if (br && prot.includes(br)) {
  block(`BLOCKED: 目前在保護分支「${br}」，git push 會觸發：${cfg.protectedBranchReason || '保護分支政策'}。需 User 明確同意。`);
}
process.exit(0);
