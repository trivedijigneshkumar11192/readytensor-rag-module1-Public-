import os, json
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
KB_PATH = os.path.join(BASE, 'data', 'jsondb', 'health_kb.jsonl')
CHROMA_DIR = os.path.join(BASE, 'data', 'vectorstores', 'chroma')

def load_kb():
    ids, texts = [], []
    with open(KB_PATH, 'r', encoding='utf-8') as f:
        for ln in f:
            ln = ln.strip()
            if not ln: continue
            o = json.loads(ln)
            ids.append(o.get('id') or f'auto_{len(ids)+1}')
            texts.append(o.get('text',''))
    return ids, texts

def main():
    os.makedirs(CHROMA_DIR, exist_ok=True)
    ids, texts = load_kb()
    print(f"KB docs: {len(texts)}")

    emb = HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={"device":"cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )
    # fresh build: delete if exists
    if os.path.isdir(os.path.join(CHROMA_DIR, "chroma-collections.parquet")):
        print("Note: overwriting existing Chroma store")
    vs = Chroma.from_texts(
        texts=texts,
        embedding=emb,
        metadatas=[{"id": i} for i in ids],
        persist_directory=CHROMA_DIR,
    )
    vs.persist()
    print(f"Chroma persisted at: {CHROMA_DIR}")

if __name__ == "__main__":
    main()
