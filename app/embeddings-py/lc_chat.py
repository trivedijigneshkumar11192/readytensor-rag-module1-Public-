import os, json, argparse
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CHROMA_DIR = os.path.join(BASE, 'data', 'vectorstores', 'chroma')

def build_chain(k=4, lang="Hinglish"):
    emb = HuggingFaceEmbeddings(
        model_name="BAAI/bge-m3",
        model_kwargs={"device":"cpu"},
        encode_kwargs={"normalize_embeddings": True}
    )
    vs = Chroma(persist_directory=CHROMA_DIR, embedding_function=emb)
    retriever = vs.as_retriever(search_kwargs={"k": k})

    # Prompt (concise + Hinglish-friendly)
    template = (
        "You are a helpful health RAG assistant. Answer in {lang}.\n"
        "Use the CONTEXT facts to answer; be concise. If unsure, say you don't know.\n\n"
        "CONTEXT:\n{context}\n\n"
        "QUESTION:\n{question}\n\n"
        "ANSWER:"
    )
    prompt = PromptTemplate(
        input_variables=["context", "question", "lang"],
        template=template
    )

    llm_primary = Ollama(model="qwen2.5:3b")
    # RetrievalQA (stuff chain) with custom prompt
    chain = RetrievalQA.from_chain_type(
        llm=llm_primary,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt.partial(lang=lang)},
        return_source_documents=True
    )
    return chain

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--q", required=True)
    ap.add_argument("--k", type=int, default=4)
    ap.add_argument("--lang", default="Hinglish")
    args = ap.parse_args()

    chain = build_chain(k=args.k, lang=args.lang)
    out = chain({"query": args.q})
    answer = out.get("result","")
    src_docs = out.get("source_documents", []) or []
    sources = []
    for d in src_docs:
        md = d.metadata or {}
        sid = md.get("id") or md.get("source") or "unknown"
        sources.append({"id": sid})
    print(json.dumps({"answer": answer, "sources": sources}, ensure_ascii=False))

if __name__ == "__main__":
    main()
