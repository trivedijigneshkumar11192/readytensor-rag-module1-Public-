import os, json, numpy as np
from sentence_transformers import SentenceTransformer

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KB_PATH   = os.path.join(BASE, 'data', 'jsondb', 'health_kb.jsonl')
VEC_PATH  = os.path.join(BASE, 'data', 'vectors', 'vectors.npy')
NRM_PATH  = os.path.join(BASE, 'data', 'vectors', 'norm.npy')
IDS_PATH  = os.path.join(BASE, 'data', 'vectors', 'facts_ids.json')

def load_kb():
  ids, texts = [], []
  with open(KB_PATH, 'r', encoding='utf-8') as f:
    for line in f:
      line = line.strip()
      if not line: continue
      o = json.loads(line)
      ids.append(o.get('id') or f'auto_{len(ids)+1}')
      texts.append(o.get('text',''))
  return ids, texts

def main():
  os.makedirs(os.path.dirname(VEC_PATH), exist_ok=True)
  ids, texts = load_kb()
  print(f'Loaded {len(texts)} docs from KB')
  model = SentenceTransformer('BAAI/bge-m3')  # local cache me aa jayega
  emb = model.encode(texts, normalize_embeddings=True, convert_to_numpy=True)
  # norms (for speed): since normalized=True, norm ~1.0; still persist to keep server logic simple
  norms = np.linalg.norm(emb, axis=1).astype('float32')
  np.save(VEC_PATH, emb.astype('float32'))
  np.save(NRM_PATH, norms)
  with open(IDS_PATH,'w',encoding='utf-8') as f:
    json.dump(ids, f, ensure_ascii=False)
  print('Saved:', VEC_PATH, NRM_PATH, IDS_PATH)

if __name__ == '__main__':
  main()
