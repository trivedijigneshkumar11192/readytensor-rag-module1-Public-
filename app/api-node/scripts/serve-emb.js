// E:\readytensor\rag_module1\app\api-node\scripts\serve-emb.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const EMB_DIR = path.resolve(__dirname, '..', '..', 'embeddings-py'); // app/embeddings-py
const pyCandidates = [
  path.join(EMB_DIR, 'venv', 'Scripts', 'python.exe'), // Windows venv
  path.join(EMB_DIR, 'venv', 'bin', 'python'),         // Linux/Mac venv
  'python3',
  'python'
];
const py = pyCandidates.find(p => (p.startsWith('python') || fs.existsSync(p))) || 'python';

console.log(`[serve-emb] using python: ${py}`);

const env = { ...process.env,
  PYTHONIOENCODING: 'utf-8',
  PYTHONUTF8: '1'
};

const child = spawn(py, ['server.py'], {
  cwd: EMB_DIR,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
  env
});

child.stdout.on('data', d => process.stdout.write(`EMB | ${d}`));
child.stderr.on('data', d => process.stderr.write(`EMB ! ${d}`));

child.on('close', (code) => {
  console.log(`[serve-emb] exited with code ${code}`);
  process.exit(code || 0);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
