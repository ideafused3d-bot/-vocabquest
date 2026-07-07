#!/usr/bin/env node
// PreToolUse hook（matcher: Edit|Write）：攔截寫入 FROZEN 路徑。
// FROZEN 清單來自 <cwd>/docs/project/harness-config.json 的 frozenPaths；設定檔不存在 → 放行（fail-open，由 doctor 警告）。
// User 同意的覆寫方式：設 HARNESS_ALLOW_PROTECTED=1（變數名可在 config 改）。
import fs from 'node:fs';
import path from 'node:path';

let input;
try { input = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { process.exit(0); }
const fp = input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path);
if (!fp) process.exit(0);

const cwd = input.cwd || process.cwd();
let cfg;
try { cfg = JSON.parse(fs.readFileSync(path.join(cwd, 'docs/project/harness-config.json'), 'utf8')); } catch { process.exit(0); }
if (process.env[cfg.overrideEnvVar || 'HARNESS_ALLOW_PROTECTED'] === '1') process.exit(0);

// Windows 檔案系統大小寫不敏感：一律轉小寫比對，防 Docs/Harness/ 這類繞過
const rel = path.relative(cwd, path.resolve(cwd, fp)).replace(/\\/g, '/').toLowerCase();
if (rel.startsWith('..')) process.exit(0); // repo 外不歸本 hook 管

for (const p of cfg.frozenPaths || []) {
  const norm = p.replace(/\\/g, '/').toLowerCase();
  const isDir = norm.endsWith('/');
  if ((isDir && rel.startsWith(norm)) || (!isDir && rel === norm)) {
    console.error(`BLOCKED: ${rel} 是 FROZEN（harness-config.json frozenPaths）。想修改 → 寫 docs/project/PROPOSALS.md 等 User 裁決；User 同意後設 ${cfg.overrideEnvVar || 'HARNESS_ALLOW_PROTECTED'}=1 再改。`);
    process.exit(2);
  }
}
process.exit(0);
