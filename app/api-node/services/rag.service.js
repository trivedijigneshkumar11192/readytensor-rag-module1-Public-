// E:\readytensor\rag_module1\app\api-node\services\rag.service.js
// Priority: LangChain + Chroma (via Python lc_chat.py) -> fallback: simple retriever + Ollama

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');

// ---- env / defaults ----
const EMB_URL = process.env.EMB_URL || 'http://127.0.0.1:9500';
const PRIMARY_MODEL = process.env.LLM_PRIMARY || 'qwen2.5:3b';
const BACKUP_MODEL  = process.env.LLM_BACKUP  || 'llama3.2:3b';
const TOP_K_DEFAULT = Number(process.env.TOP_K || 4);

// embeddings-py folder (from services/ -> api-node/ -> app/ -> embeddings-py/)
const EMB_DIR = path.resolve(__dirname, '..', '..', 'embeddings-py');

// choose python (prefer project venv)
function pickPython() {
  const pyWin = path.join(EMB_DIR, 'venv', 'Scripts', 'python.exe');
  const pyNix = path.join(EMB_DIR, 'venv', 'bin', 'python');
  if (process.platform === 'win32' && fs.existsSync(pyWin)) return pyWin;
  if (fs.existsSync(pyNix)) return pyNix;
  return process.platform === 'win32' ? 'python' : 'python3';
}

// -------------- LLM helpers --------------
function callOllama(model, prompt) {
  return new Promise((resolve, reject) => {
    const p = spawn('ollama', ['run', model], { stdio: ['pipe','pipe','inherit'] });
    let out = '';
    p.stdout.on('data', d => out += d.toString());
    p.on('close', (code) => code===0 ? resolve(out.trim()) : reject(new Error(`ollama failed (${model})`)));
    p.stdin.write(prompt);
    p.stdin.end();
  });
}

function callLangChain(query, { lang='Hinglish', top_k=TOP_K_DEFAULT } = {}) {
  return new Promise((resolve, reject) => {
    const py = pickPython();
    const script = path.join(EMB_DIR, 'lc_chat.py');
    const args = [script, '--q', query, '--k', String(top_k), '--lang', lang];

    const env = { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' };
    const child = spawn(py, args, {
      cwd: EMB_DIR,
      env,
      shell: process.platform === 'win32'
    });

    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(err || `lc_chat exit ${code}`));
      try {
        const json = JSON.parse(out);
        resolve(json); // { answer, sources:[{id}], ... }
      } catch (e) {
        reject(new Error('lc_chat JSON parse error: ' + e.message));
      }
    });
  });
}

// -------------- Main pipeline --------------
async function retrieveAndAnswer(query, opts = {}) {
  const lang = (opts.lang || 'Hinglish');
  const top_k = Number(opts.top_k || TOP_K_DEFAULT);

  // --- 1) Try LangChain + Chroma ---
  try {
    const r = await callLangChain(query, { lang, top_k });
    // normalize output
    const answer = String(r.answer || r.result || '').trim();
    const sources = Array.isArray(r.sources) ? r.sources : [];
    if (answer) {
      return { answer, sources, engine: 'langchain+chroma' };
    }
    // if empty answer, fall through to fallback
  } catch (e) {
    console.error('[rag.service] LangChain pipeline failed:', e.message);
  }

  // --- 2) Fallback: simple retriever (embeddings server) + Ollama ---
  let retrieved = { hits: [] };
  try {
    retrieved = await axios
      .post(`${EMB_URL}/search`, { query, k: top_k }, { timeout: 20_000 })
      .then(x => x.data);
  } catch (e) {
    console.error('[rag.service] embeddings /search error:', e.message);
  }

  const contexts = (retrieved.hits || []).map(h => `- ${h.text}`).join('\n');
  const sys = `You are a helpful RAG chatbot. Answer in ${lang}. Cite facts from CONTEXT if relevant. If answer is not in context, say you don't know.`;
  const prompt = `${sys}\n\nQUESTION:\n${query}\n\nCONTEXT:\n${contexts}\n\nANSWER:`;

  try {
    const answer = await callOllama(PRIMARY_MODEL, prompt);
    return { answer, sources: retrieved.hits || [], engine: 'simple' };
  } catch (e) {
    const answer = await callOllama(BACKUP_MODEL, prompt);
    return { answer, sources: retrieved.hits || [], engine: 'simple-llama' };
  }
}

module.exports = { retrieveAndAnswer };
