# Flask embeddings/search server (bge-m3, cosine search)
import os, json, numpy as np
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)

# ---------- Paths ----------
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KB_PATH   = os.path.join(BASE, 'data', 'jsondb', 'health_kb.jsonl')
VEC_PATH  = os.path.join(BASE, 'data', 'vectors', 'vectors.npy')
NRM_PATH  = os.path.join(BASE, 'data', 'vectors', 'norm.npy')
IDS_PATH  = os.path.join(BASE, 'data', 'vectors', 'facts_ids.json')

# ---------- Load KB ----------
ID2TEXT = {}
def load_kb():
    global ID2TEXT
    ID2TEXT = {}
    if not os.path.exists(KB_PATH):
        return 0
    with open(KB_PATH, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
                _id = o.get('id') or f'auto_{len(ID2TEXT)+1}'
                ID2TEXT[_id] = o.get('text', '')
            except:
                pass
    return len(ID2TEXT)

# ---------- Load vectors ----------
V = None
IDS = None
def load_vectors():
    global V, IDS
    if not (os.path.exists(VEC_PATH) and os.path.exists(IDS_PATH)):
        V, IDS = None, None
        return (0, 0)
    V = np.load(VEC_PATH, mmap_mode='r')  # memmap to save RAM
    with open(IDS_PATH, 'r', encoding='utf-8') as f:
        IDS = json.load(f)
    return (V.shape[0], V.shape[1])

# ---------- Model ----------
MODEL = None
def load_model():
    global MODEL
    if MODEL is None:
        MODEL = SentenceTransformer('BAAI/bge-m3')  # CPU OK
    return MODEL

def embed(text: str) -> np.ndarray:
    m = load_model()
    emb = m.encode([text], normalize_embeddings=True, convert_to_numpy=True)[0].astype('float32')
    return emb

# ---------- CORS ----------
@app.after_request
def add_cors(resp):
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    return resp

# ---------- Endpoints ----------
@app.get('/ping')
def ping():
    kb_cnt = len(ID2TEXT) or load_kb()
    rows, dim = 0, 0
    if V is None or IDS is None:
        r = load_vectors()
        rows, dim = r
    else:
        rows, dim = int(V.shape[0]), int(V.shape[1])
    return jsonify({'ok': True, 'kb_count': kb_cnt, 'vectors': {'rows': rows, 'dim': dim}})

@app.post('/search')
def search():
    data = request.get_json(force=True) or {}
    q = (data.get('query') or '').strip()
    k = int(data.get('k') or 4)
    if not q:
        return jsonify({'hits': []})

    # Load vectors/KB if needed
    if V is None or IDS is None:
        load_vectors()
    if not (V is not None and IDS is not None and len(IDS) > 0):
        if not ID2TEXT:
            load_kb()
        hits = []
        for i, (idv, txt) in enumerate(list(ID2TEXT.items())[:k]):
            hits.append({'id': idv, 'score': 0.0, 'text': txt})
        return jsonify({'hits': hits})

    # cosine similarity (V and q normalized) => cos = V @ q
    qv = embed(q)
    scores = V @ qv
    idx = np.argsort(-scores)[:k]
    hits = []
    for i in idx:
        i = int(i)
        _id = IDS[i]
        hits.append({'id': _id, 'score': float(scores[i]), 'text': ID2TEXT.get(_id, '')})
    return jsonify({'hits': hits})

if __name__ == '__main__':
    kb_docs = load_kb()
    rows, dim = load_vectors()
    # ASCII-only print (no emojis) to avoid cp1252 issues on Windows pipes
    print(f'KB docs: {kb_docs} | vectors: {rows}x{dim}')
    app.run(host='127.0.0.1', port=9500)
