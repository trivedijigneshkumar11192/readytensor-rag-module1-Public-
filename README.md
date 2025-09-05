# RAG Health Chatbot (Module 1 – AAIDC)

Single-command start: Node API + Python Embeddings + Chroma (LangChain)

## Quick Start

### Windows
```powershell
cd E:\readytensor\rag_module1\app\api-node
npm install
npm start
# Open: http://localhost:8800/index

Project: RAG Health Chatbot (Module 1 – AAIDC)

How to Run (Linux/Runner):
cd app/api-node && npm install && npm start
UI: http://localhost:8800/index

If models needed:
ollama pull qwen2.5:3b && ollama pull llama3.2:3b

KB Load (RAW):
https://raw.githubusercontent.com/trivedijigneshkumar11192/readytensor-rag-module1-Public-/main/data/samples/health_kb.jsonl

Architecture:
- Embeddings: BAAI/bge-m3 (SentenceTransformers)
- Vector DB: Chroma (data/vectorstores/chroma)
- Orchestration: LangChain RetrievalQA (stuff)
- LLM: Ollama qwen2.5:3b (primary), llama3.2:3b (fallback)
- One-command start: npm start (prestart = venv + deps + Chroma build)

Sample Prompts:
- “BP control ke lifestyle tips?”
- “Cholesterol LDL kaise kam karu?”
- “Diabetes ke early symptoms?”

Repo: https://github.com/trivedijigneshkumar11192/readytensor-rag-module1-Public-
Video: <YouTube Unlisted URL>
