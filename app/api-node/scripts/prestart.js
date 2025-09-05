// prestart: setup venv + install deps + build Chroma (auto OS detect)
const { execSync } = require('child_process');

function run(cmd) {
  console.log(`[prestart] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
}

try {
  if (process.platform === 'win32') {
    run('npm run setup:emb:win');
    run('npm run build:chroma:win');
  } else {
    run('npm run setup:emb:nix');
    run('npm run build:chroma:nix');
  }
  console.log('[prestart] Done.');
} catch (e) {
  console.error('[prestart] Failed:', e.message);
  process.exit(1);
}
