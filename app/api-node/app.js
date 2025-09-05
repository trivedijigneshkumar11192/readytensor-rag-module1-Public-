// E:\readytensor\rag_module1\app\api-node\app.js
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// --- optional .env ---
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../../profiles/.env') });
} catch {}

// ---- repo paths ----
const ROOT = path.resolve(__dirname, '..', '..'); // ...\rag_module1
const REPO = ROOT;
const DATA_DIR = path.join(REPO, 'data');
const JSONDB_DIR = path.join(DATA_DIR, 'jsondb');
const META_DIR = path.join(DATA_DIR, 'meta');
const WEB_UI_DIR = path.join(REPO, 'web-ui');

const HEALTH_KB_FILE = path.join(JSONDB_DIR, 'health_kb.jsonl');
const META_SCHEMA_FILE = path.join(META_DIR, 'schema.json');

const PORT = process.env.PORT || 8800;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

// ---------- utils ----------
async function ensureDirs() {
  for (const d of [DATA_DIR, JSONDB_DIR, META_DIR]) {
    await fsp.mkdir(d, { recursive: true });
  }
}
function isLikelyJSONL(s = '') {
  const lines = s.split(/\r?\n/).filter(Boolean);
  let jsonLike = 0;
  for (const ln of lines.slice(0, 5)) {
    const t = ln.trim();
    if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('{"') && t.endsWith('}'))) jsonLike++;
  }
  return jsonLike >= 2;
}
function normalizeObj(obj) {
  const id = String(obj?.id ?? obj?.doc_id ?? obj?.uid ?? obj?.key ?? '').trim();
  let text = obj?.text ?? obj?.content ?? obj?.abstract ?? obj?.body ?? obj?.description ?? '';
  if (typeof text !== 'string') text = JSON.stringify(text || '');
  return { id: id || undefined, text: text.trim() };
}
async function writeJSONLFromJSONArray(arr, outfile) {
  const chunks = [];
  for (const item of arr) {
    const { id, text } = normalizeObj(item);
    if (!text) continue;
    const row = { id: id || `auto_${chunks.length + 1}`, text };
    chunks.push(JSON.stringify(row));
  }
  await fsp.writeFile(outfile, chunks.join('\n') + '\n', 'utf8');
  return chunks.length;
}
async function countLines(filePath) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const rs = fs.createReadStream(filePath, { encoding: 'utf8' });
    rs.on('data', (buf) => {
      for (let i = 0; i < buf.length; i++) if (buf[i] === '\n') count++;
    });
    rs.on('end', () => resolve(count));
    rs.on('error', reject);
  });
}

// ---- serve web-ui (important: BEFORE other routes) ----
app.use('/ui', express.static(WEB_UI_DIR, { extensions: ['html'] })); // /ui/css, /ui/js
app.use(express.static(WEB_UI_DIR, { extensions: ['html'] }));        // /css, /js at root
app.get('/index', (req, res) => res.sendFile(path.join(WEB_UI_DIR, 'index.html')));

// ---------- routes: root + health ----------
app.get('/', (req, res) => {
  res.send('RAG API running. Use POST /api/chat  •  Health KB: /admin/download-health  •  Status: /health  •  UI: /index');
});

app.get('/health', async (req, res) => {
  try {
    await ensureDirs();
    const exists = fs.existsSync(HEALTH_KB_FILE);
    const kbLines = exists ? await countLines(HEALTH_KB_FILE) : 0;
    res.json({
      ok: true,
      service: 'RAG API',
      port: Number(PORT),
      data_paths: {
        kb: HEALTH_KB_FILE,
        meta: META_SCHEMA_FILE
      },
      kb_exists: exists,
      kb_count: kbLines
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- routes: chatbot ----------
app.use('/api/chat', require('./routes/chat.routes')); // POST /api/chat

// ---------- admin: health KB downloader ----------
// body: { url: "https://example.com/health.jsonl|.json" }
app.post('/admin/download-health', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ ok: false, error: 'url required' });
    }

    await ensureDirs();

    const r = await axios.get(url, { responseType: 'text', timeout: 60_000 });
    const raw = r.data;

    if (isLikelyJSONL(raw)) {
      await fsp.writeFile(HEALTH_KB_FILE, raw.trim().replace(/\r\n/g, '\n') + '\n', 'utf8');
    } else {
      let parsed;
      try { parsed = JSON.parse(raw); }
      catch { return res.status(400).json({ ok: false, error: 'Unsupported format: provide JSONL or JSON array' }); }

      if (!Array.isArray(parsed)) {
        return res.status(400).json({ ok: false, error: 'JSON must be an array of objects with {id?, text?}' });
      }
      const n = await writeJSONLFromJSONArray(parsed, HEALTH_KB_FILE);
      if (n === 0) return res.status(400).json({ ok: false, error: 'No valid items with text found in JSON' });
    }

    const schema = {
      kb_file: path.relative(REPO, HEALTH_KB_FILE).replace(/\\/g, '/'),
      fields: { id: 'string', text: 'string' },
      updated_at: new Date().toISOString(),
      source_url: url
    };
    await fsp.writeFile(META_SCHEMA_FILE, JSON.stringify(schema, null, 2), 'utf8');

    const lines = await countLines(HEALTH_KB_FILE);
    res.json({ ok: true, saved: HEALTH_KB_FILE, count: lines });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ---------- start ----------
app.listen(PORT, () => {
  console.log('API running on http://localhost:' + PORT);
});
