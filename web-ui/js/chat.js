const API_BASE = location.origin; // serve via /index -> same origin
const EMB_BASE = 'http://127.0.0.1:9500';

const $ = s => document.querySelector(s);
const chat = $('#chat'), q = $('#q'), btn = $('#send'), langSel = $('#lang');
const apiBadge = $('#apiStatus'), kbBadge = $('#kbStatus'), embBadge = $('#embStatus');
const kbUrl = $('#kbUrl'), btnDownload = $('#btnDownload'), btnCheck = $('#btnCheck');

function setBadge(el, text, cls='ok'){
  el.textContent = text;
  el.classList.remove('ok','warn','err');
  el.classList.add(cls);
}

function avatarSVG(kind='bot'){
  return kind === 'me'
    ? '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#dff8ee" d="M12 12a5 5 0 1 0-5-5a5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#e8ecff" d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"/></svg>';
}

function msgEl(text, who='bot', sources=[]){
  const wrap = document.createElement('div');
  wrap.className = `msg ${who}`;
  wrap.innerHTML = `
    <div class="avatar ${who}">${avatarSVG(who)}</div>
    <div>
      <div class="bubble">${text}</div>
      ${sources?.length ? `<div class="sources">${
        sources.map(s=>`<span class="source-chip">${s.id}</span>`).join('')
      }</div>` : ''}
    </div>
  `;
  return wrap;
}

let typingEl = null;
function showTyping(){
  typingEl = document.createElement('div');
  typingEl.className = 'msg bot';
  typingEl.innerHTML = `
    <div class="avatar">${avatarSVG('bot')}</div>
    <div>
      <div class="bubble"><span class="typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span></div>
      <div class="meta">Thinking…</div>
    </div>`;
  chat.appendChild(typingEl);
  chat.scrollTop = chat.scrollHeight;
}
function hideTyping(){
  if(typingEl){ typingEl.remove(); typingEl=null; }
}

async function pingAPI(){
  try{
    const r = await fetch(API_BASE+'/health').then(r=>r.json());
    if(r.ok){
      setBadge(apiBadge, `API:${r.port}`, 'ok');
      setBadge(kbBadge, r.kb_exists ? `KB:${r.kb_count}` : 'KB:missing', r.kb_exists?'ok':'warn');
    }else{
      setBadge(apiBadge, 'API:err', 'err'); setBadge(kbBadge,'KB:?','warn');
    }
  }catch(e){
    setBadge(apiBadge, 'API:down', 'err'); setBadge(kbBadge,'KB:?','warn');
  }
}

async function pingEmb(){
  try {
    await fetch(EMB_BASE+'/ping').then(r=>r.json());
    setBadge(embBadge, 'Emb:ok', 'ok');
  } catch {
    setBadge(embBadge, 'Emb:down', 'warn');
  }
}

async function send(){
  const text = q.value.trim(); if(!text) return;
  chat.appendChild(msgEl(text,'me')); chat.scrollTop = chat.scrollHeight;
  q.value=''; q.focus();
  btn.disabled = true; showTyping();

  try{
    const r = await fetch(API_BASE+'/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ query: text, lang: langSel.value || 'Hinglish' })
    }).then(r=>r.json());
    hideTyping();
    if(!r.ok) throw new Error(r.error||'failed');
    chat.appendChild(msgEl(r.answer,'bot', r.sources||[]));
    chat.scrollTop = chat.scrollHeight;
  }catch(e){
    hideTyping();
    chat.appendChild(msgEl('❌ Error: '+e.message,'bot'));
  }finally{
    btn.disabled = false;
  }
}

async function downloadKB(){
  const url = (kbUrl.value||'').trim();
  if(!url) return alert('URL do (JSONL/JSON array).');
  try{
    const r = await fetch(API_BASE+'/admin/download-health', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ url })
    }).then(r=>r.json());
    if(!r.ok) throw new Error(r.error||'download failed');
    localStorage.setItem('kbUrl', url);
    await pingAPI();
    alert(`KB saved ✅\nFile: ${r.saved}\nDocs: ${r.count}`);
  }catch(e){ alert('KB download error: '+e.message); }
}

btn.addEventListener('click', send);
q.addEventListener('keydown', e=>{ if(e.key==='Enter') send(); });
btnDownload.addEventListener('click', downloadKB);
btnCheck.addEventListener('click', ()=>{ pingAPI(); pingEmb(); });

(async function init(){
  const cached = localStorage.getItem('kbUrl'); if(cached) kbUrl.value = cached;
  await pingAPI(); await pingEmb();
})();
