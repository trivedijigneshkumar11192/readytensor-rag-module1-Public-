@echo off
set "ROOT=E:\readytensor\rag_module1"

rem ---------- Folders ----------
mkdir "%ROOT%" 2>nul
mkdir "%ROOT%\app\api-node\routes" 2>nul
mkdir "%ROOT%\app\api-node\controllers" 2>nul
mkdir "%ROOT%\app\api-node\services" 2>nul
mkdir "%ROOT%\app\api-node\utils" 2>nul
mkdir "%ROOT%\app\embeddings-py" 2>nul

mkdir "%ROOT%\web-ui\css" 2>nul
mkdir "%ROOT%\web-ui\js" 2>nul

mkdir "%ROOT%\data\docs" 2>nul
mkdir "%ROOT%\data\jsondb" 2>nul
mkdir "%ROOT%\data\vectors" 2>nul
mkdir "%ROOT%\data\meta" 2>nul

mkdir "%ROOT%\scripts" 2>nul
mkdir "%ROOT%\profiles" 2>nul

rem ---------- Top-level files ----------
type nul > "%ROOT%\README.md"
type nul > "%ROOT%\.gitignore"

rem ---------- Node chatbot (only) ----------
type nul > "%ROOT%\app\api-node\app.js"
type nul > "%ROOT%\app\api-node\package.json"
type nul > "%ROOT%\app\api-node\README.md"

type nul > "%ROOT%\app\api-node\routes\chat.routes.js"
type nul > "%ROOT%\app\api-node\controllers\chat.controller.js"
type nul > "%ROOT%\app\api-node\services\rag.service.js"
type nul > "%ROOT%\app\api-node\utils\textclean.js"

rem ---------- Embeddings (stub, no code yet) ----------
type nul > "%ROOT%\app\embeddings-py\server.py"
type nul > "%ROOT%\app\embeddings-py\requirements.txt"
type nul > "%ROOT%\app\embeddings-py\README.md"

rem ---------- Web UI (single chatbot page) ----------
type nul > "%ROOT%\web-ui\index.html"
type nul > "%ROOT%\web-ui\css\app.css"
type nul > "%ROOT%\web-ui\js\chat.js"
type nul > "%ROOT%\web-ui\README.md"

rem ---------- Data placeholders ----------
type nul > "%ROOT%\data\docs\sample1.txt"
type nul > "%ROOT%\data\jsondb\kb.jsonl"
type nul > "%ROOT%\data\vectors\facts_ids.json"
type nul > "%ROOT%\data\vectors\vectors.npy"
type nul > "%ROOT%\data\vectors\norm.npy"
type nul > "%ROOT%\data\meta\schema.json"

rem ---------- Scripts (stubs) ----------
type nul > "%ROOT%\scripts\normalize_docs.md"
type nul > "%ROOT%\scripts\build_vectors.md"

rem ---------- Profiles ----------
type nul > "%ROOT%\profiles\.env.example"
type nul > "%ROOT%\profiles\README.md"

echo.
echo ✅ Directory structure ready at: %ROOT%
